from fastapi import *
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool
from enum import Enum
from passlib.context import CryptContext
from typing import Optional
import jwt
from datetime import date
import time 
from typing import Dict

router=APIRouter()


bcrypt_context =CryptContext(schemes =["bcrypt"], deprecated="auto")
JWT_SECRET = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
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
        "exp": time.time() + 86400 #expire in 1 day
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
            return JSONResponse(status_code=400, content={"error": True, "message": "Token expired"})
        except jwt.InvalidTokenError:
            return JSONResponse(status_code=400, content={"error": True, "message": "Invalid Token"})
    else:
        return JSONResponse(status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"})


#用戶註冊
@router.post("/api/user", tags=["Member"])
async def registerUser(user:UserSignup):
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		mycursor.execute("SELECT * FROM member WHERE email = %s", (user.email,))
		existing_user = mycursor.fetchone()
		if existing_user:    
				return JSONResponse(
					status_code=400, 
					content={"error":True, "message":"Email已註冊"}
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
@router.put("/api/user/auth", tags=["Member"])
async def login(user:UserLogIn):
		print(user)
		try: 
			db =cnxpool.get_connection()
			mycursor = db.cursor()
			sql="SELECT * FROM member WHERE email=%s"
			val=(user.email,)
			mycursor.execute(sql, val)
			existing_user = mycursor.fetchone()
			print("hello this is exiating_user", existing_user)
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
							content={"error":True, "message":"Email或密碼有誤"}
							) 
			else:
				return JSONResponse(
					status_code=400, 
					content={"error":True, "message":"Email或密碼有誤"}
					) 
		except Exception:
			return JSONResponse(
				status_code=500, 
				content={"error":True, "message":"伺服器內部錯誤"}
				)
		finally:
			db.close()
			
            
@router.get("/api/user/auth" , tags=["Member"])
async def getUser(token:dict =Depends(decodeJWT)):
	if isinstance(token, JSONResponse):
		return token
	return { "data": dict(list(token.items())[0: 3]) } #Using slicing on dictionary item list so expiry date isn't included





@router.get("/api/member/{memberId}",tags=["Member"])
async def getMember(memberId:int):
        try:
            db =cnxpool.get_connection()
            mycursor = db.cursor()
            sql="""
			SELECT
				m.memberId,
				m.username,
				m.gender,
				m.height,
				m.grade,
				SUM(a.type) AS flash_count,  
				COUNT(a.routeId) - SUM(a.type) AS done_count 
			FROM
				member m
			LEFT JOIN achievement a ON m.memberId = a.memberId
			WHERE
				m.memberId =%s
			GROUP BY
				m.memberId, m.gender, m.height, m.grade;
			"""
            val=(memberId,)
            mycursor.execute(sql,val)
            result=mycursor.fetchone()

            if result:
                data={
	                "memberId":result[0],
	                "username":result[1],
	                "gender":result[2],
	                "height":result[3],
	                "grade":result[4],
	                "flash":result[5],
	                "done":result[6]
                }
            return data	

        
        except Exception as e:
            print(f"An error occurred: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
        finally:
            if db.is_connected():
                mycursor.close()
                db.close()


@router.get("/api/save/{memberId}", tags=["Member"])
async def getMemberRoute(memberId:int):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql ="""
			SELECT 
				r.routeId, 
				r.name AS routeName, 
				r.grade AS routeGrade, 
				r.expired AS expiredDate
			FROM 
				route r
			JOIN 
				savedRoute sr ON r.routeId = sr.routeId
			WHERE 
			sr.memberId = %s;
		"""
        val=memberId
        mycursor.execute(sql,(val,))
        results=mycursor.fetchall()

        if results is None:
           return{"data":None}

        else:
            allRoutes = []
            for result in results:
                data = {
                    "routeId": result[0],
                    "routeName": result[1],
                    "routeGrade": result[2],
                    "expiredDate": result[3],
                }
                allRoutes.append(data)  # This should be inside the for loop

            return {"data": allRoutes}



    except Exception as e:
        return JSONResponse(
			status_code=500,
			content={
				"error":True,
				"message":f"Internal Server Error: {str(e)}"
			}
		)    
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()    
