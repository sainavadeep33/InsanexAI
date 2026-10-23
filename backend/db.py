import json
import os
import sqlite3
from pathlib import Path
from typing import Optional, Dict, Any, List

DB_PATH = Path(__file__).resolve().parent / "insanexai.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 1. Users table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # 2. Conversations table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        # 3. Messages table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                attachment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """
        )

        # Ensure attachment and sources columns exist if table was created previously
        cursor.execute("PRAGMA table_info(messages)")
        cols = [row["name"] for row in cursor.fetchall()]
        if "attachment" not in cols:
            cursor.execute("ALTER TABLE messages ADD COLUMN attachment TEXT")
        if "sources" not in cols:
            cursor.execute("ALTER TABLE messages ADD COLUMN sources TEXT")

        # Indices for speed
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, id ASC)"
        )
        conn.commit()



# --- User Helpers ---

def create_user(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (?, ?, ?)
            """,
            (name.strip(), email.strip().lower(), password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "name": name.strip(),
            "email": email.strip().lower(),
        }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.strip().lower(),),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


# --- Conversation & Message Helpers ---

def list_user_conversations(
    user_id: int, search_query: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List all conversations belonging to the user, newest first. Optionally filters by title or message content."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if search_query and search_query.strip():
            term = f"%{search_query.strip().lower()}%"
            cursor.execute(
                """
                SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.user_id = ?
                  AND (LOWER(c.title) LIKE ? OR LOWER(m.text) LIKE ?)
                ORDER BY c.updated_at DESC
                """,
                (user_id, term, term),
            )
        else:
            cursor.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM conversations
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """,
                (user_id,),
            )

        rows = cursor.fetchall()
        result = []
        for r in rows:
            conv = dict(r)
            # Fetch message count and preview
            cursor.execute(
                "SELECT role, text, attachment, sources FROM messages WHERE conversation_id = ? ORDER BY id ASC",
                (conv["id"],),
            )
            msg_rows = cursor.fetchall()
            parsed_msgs = []
            for m in msg_rows:
                item = {"role": m["role"], "text": m["text"]}
                if m["attachment"]:
                    try:
                        item["attachment"] = json.loads(m["attachment"])
                    except Exception:
                        item["attachment"] = None
                if "sources" in m.keys() and m["sources"]:
                    try:
                        item["sources"] = json.loads(m["sources"])
                    except Exception:
                        item["sources"] = None
                parsed_msgs.append(item)
            conv["messages"] = parsed_msgs
            result.append(conv)
        return result


def get_user_conversation(
    user_id: int, conversation_id: str
) -> Optional[Dict[str, Any]]:
    """Retrieve a single conversation ensuring user ownership."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        conv_row = cursor.fetchone()
        if not conv_row:
            return None

        conv = dict(conv_row)
        cursor.execute(
            "SELECT role, text, attachment, sources FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        )
        msg_rows = cursor.fetchall()
        parsed_msgs = []
        for m in msg_rows:
            item = {"role": m["role"], "text": m["text"]}
            if m["attachment"]:
                try:
                    item["attachment"] = json.loads(m["attachment"])
                except Exception:
                    item["attachment"] = None
            if "sources" in m.keys() and m["sources"]:
                try:
                    item["sources"] = json.loads(m["sources"])
                except Exception:
                    item["sources"] = None
            parsed_msgs.append(item)
        conv["messages"] = parsed_msgs
        return conv


def save_user_conversation(
    user_id: int,
    conversation_id: str,
    title: str,
    messages_list: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Create or update a conversation and its messages atomically, enforcing user ownership."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Check if conversation belongs to another user
        cursor.execute(
            "SELECT user_id FROM conversations WHERE id = ?",
            (conversation_id,),
        )
        existing = cursor.fetchone()
        if existing and existing["user_id"] != user_id:
            raise PermissionError("Access denied: You do not own this conversation.")

        cursor.execute(
            """
            INSERT INTO conversations (id, user_id, title)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                updated_at = CURRENT_TIMESTAMP
            WHERE conversations.user_id = ?
            """,
            (conversation_id, user_id, title.strip(), user_id),
        )
        # Clear existing messages to replace with current ordered snapshot
        cursor.execute(
            "DELETE FROM messages WHERE conversation_id = ?",
            (conversation_id,),
        )

        # Insert messages in order
        for msg in messages_list:
            text = (msg.get("text") or "").strip()
            role = msg.get("role") or "user"
            attachment = msg.get("attachment")
            sources = msg.get("sources")
            att_json = json.dumps(attachment) if attachment else None
            src_json = json.dumps(sources) if sources else None
            if text or att_json or src_json:
                cursor.execute(
                    """
                    INSERT INTO messages (conversation_id, role, text, attachment, sources)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (conversation_id, role, text, att_json, src_json),
                )

        conn.commit()
        return get_user_conversation(user_id, conversation_id)


def rename_user_conversation(
    user_id: int, conversation_id: str, new_title: str
) -> bool:
    """Rename a conversation validating user ownership."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (new_title.strip(), conversation_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def delete_user_conversation(user_id: int, conversation_id: str) -> bool:
    """Delete a conversation and its messages, enforcing user ownership."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Check ownership first
        cursor.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        if not cursor.fetchone():
            return False

        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cursor.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        conn.commit()
        return True


def check_conversation_ownership(user_id: int, conversation_id: str) -> bool:
    """Check if conversation belongs to user_id (or doesn't exist yet). Returns False if owned by someone else."""
    cid = (conversation_id or "").strip()
    if not cid or cid in ("null", "undefined", "none", "0"):
        return True  # Fresh conversation id
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id FROM conversations WHERE id = ?",
            (cid,),
        )
        row = cursor.fetchone()
        if not row:
            return True  # Fresh conversation id
        return row["user_id"] == user_id


