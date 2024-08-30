from fastapi import *
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool
from passlib.context import CryptContext
import jwt
import time 
from typing import Dict
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv


load_dotenv()
router=APIRouter()


bcrypt_context =CryptContext(schemes =["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise EnvironmentError("JWT_SECRET environment variable not set.")
JWT_ALGORITHM = "HS256"		


class UserLogIn(BaseModel):
	email:str
	password:str       

class UserSignup(BaseModel):
	email:str
	password:str
	username:str
	gender: str
	height: int
	grade:str

   

def token_response(token: str):
    return {
        "token": token
    }

def signJWT(id: str, name:str, email:str) -> Dict[str, str]:
    payload = {
		"id":id,
        "name": name,
		"email":email,
        "exp": time.time() +  30 * 86400 #expire in 30 day
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token_response(token)

def get_password_hash(password):
	return bcrypt_context.hash(password)

def verify_password(plain_password, hash_password):
	return bcrypt_context.verify(plain_password,hash_password)

def decodeJWT(request: Request):
    token = request.headers.get('Authorization')

    if token:
        try:
            token = token.replace('Bearer ', '')
            decoded_jwt = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return decoded_jwt
        except jwt.ExpiredSignatureError:
            return JSONResponse(status_code=400, content={"error": True, "message": "Token expired, please sign in again"})
        except jwt.InvalidTokenError:
            return JSONResponse(status_code=400, content={"error": True, "message": "Invalid Token"})
    else:
        return JSONResponse(status_code=403, content={"error": True, "message": "Not logged into the system, access denied."})


#用戶註冊
@router.post("/api/user", tags=["Auth"])
async def registerUser(user:UserSignup):
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		mycursor.execute("SELECT * FROM member WHERE email = %s", (user.email,))
		existing_user = mycursor.fetchone()
		if existing_user:    
				return JSONResponse(
					status_code=400, 
					content={"error":True, "message":"Email is registerd."}
					)
		
		else:
			hash_password = get_password_hash(user.password)           
			sql = "INSERT INTO member (email, hash_password, username, gender, height, grade) VALUES (%s, %s, %s, %s, %s, %s)"
			val = (user.email, hash_password, user.username, user.gender, user.height, user.grade)
			mycursor.execute(sql, val)
			db.commit()
			return {"ok": True}
	except Exception as e:
		print(f"Error occurred: {e}") 
		return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
	finally:
           db.close()
            


#用戶登入
@router.put("/api/user/auth", tags=["Auth"])
async def login(user:UserLogIn):
		print(user)
		try: 
			db =cnxpool.get_connection()
			mycursor = db.cursor()
			sql="SELECT * FROM member WHERE email=%s"
			val=(user.email,)
			mycursor.execute(sql, val)
			existing_user = mycursor.fetchone()
			# print("hello this is exiating_user", existing_user)
			if existing_user:
					hash_password=existing_user[2]
					print("and this is dat hash_password u want",hash_password, "and da user passwerd", user.password)
					if verify_password(user.password, hash_password):
						id=existing_user[0]
						email=existing_user[1]
						name=existing_user[3]
						print(verify_password)
						return signJWT(id,name,email)
					else:
						return JSONResponse(
							status_code=400, 
 							content={"error":True, "message":"Email or password invalid"}
							) 
			else:
				return JSONResponse(
					status_code=400, 
					content={"error":True, "message":"Email or password invalid"}
					) 
		except Exception:
			return JSONResponse(
				status_code=500, 
				content={"error":True, "message":"Internal Server Error"}
				)
		finally:
			db.close()
			
            
@router.get("/api/user/auth" , tags=["Auth"])
async def getUser(token:dict =Depends(decodeJWT)):
	if isinstance(token, JSONResponse):
		return token
	return { "data": dict(list(token.items())[0: 3]) } #Using slicing on dictionary item list so expiry date isn't included


