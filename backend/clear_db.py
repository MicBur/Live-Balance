import os
from pymongo import MongoClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongo:27017/heymark")
DB_NAME = "heymark"

def clear_database():
    try:
        client = MongoClient(MONGODB_URL)
        client.drop_database(DB_NAME)
        print(f"Database '{DB_NAME}' dropped successfully.")
    except Exception as e:
        print(f"Error dropping database: {e}")

if __name__ == "__main__":
    clear_database()
