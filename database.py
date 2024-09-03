from mysql.connector.pooling import MySQLConnectionPool
from dotenv import load_dotenv
import os
from redis import Redis

dbconfig = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE")
}
# print("Database configuration:", dbconfig)
cnxpool = MySQLConnectionPool(pool_name="mypool", pool_size=32, **dbconfig)


rd = Redis(host="redis", port=6379, db=0)

