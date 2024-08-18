from mysql.connector.pooling import MySQLConnectionPool
from dotenv import load_dotenv
import os

# dbconfig = {
#     "host": "localhost",
#     "user": "root",
#     "password": "jmhg42thSQL!",
#     "database": "component"
# }

# load_dotenv() 

dbconfig = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE")
}
# print("Database configuration:", dbconfig)
cnxpool = MySQLConnectionPool(pool_name="mypool", pool_size=32, **dbconfig)