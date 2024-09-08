from fastapi import *
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool, rd
from typing import Optional
from datetime import date, datetime
from mysql.connector import Error
from api.auth import decodeJWT
import json


router=APIRouter()



      
class RouteSave(BaseModel):
	memberId:int
	routeId:int


class DoneRoute(BaseModel):
	memberId:int
	routeId:int
	type: int
	completed_date:Optional[date]=None

class CustomJSONEncoder(json.JSONEncoder):
    """JSON Encoder that converts dates and datetimes to ISO format."""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)
    
@router.post("/api/save", tags=["Record"])
async def savedRoute(route:RouteSave,token: dict = Depends(decodeJWT)):
	if isinstance(token,JSONResponse):
		return token
      
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		sql_check="""
		SELECT * FROM savedRoute WHERE memberId=%s AND routeId=%s 
		"""
		val_check=(token["id"], route.routeId)
		mycursor.execute(sql_check,val_check)
		result=mycursor.fetchone()
		if result is None:
			sql="""
			INSERT INTO savedRoute (memberId, routeId)
			VALUES (%s, %s)
			"""
			val=(token["id"], route.routeId)
			mycursor.execute(sql,val)
			db.commit()
			cache_key = f"saved_routes_{token['id']}"
			rd.delete(cache_key)      
			return {"ok":True}
            
		else:
			return{"ok":False}
	
	except Exception as e:
		print(f"Error occurred: {e}") 
		return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
	finally:
		mycursor.close()
		db.close()











@router.post("/api/done",tags=["Record"])
async def routeDone(done:DoneRoute,token: dict = Depends(decodeJWT)):
	print("this is what I got from the front:",done)  
	if isinstance(token,JSONResponse):
		return token
      
        
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		sql_check="""
		SELECT * FROM achievement WHERE memberId=%s AND routeId=%s 
		"""
		val_check=(token["id"], done.routeId)
		mycursor.execute(sql_check,val_check)
		result=mycursor.fetchone()
		if result is None:
			sql="""
			INSERT INTO achievement (memberId, routeId, type)
			VALUES (%s, %s, %s)
			"""
			val=(token["id"], done.routeId, done.type)
			mycursor.execute(sql,val)
			db.commit()
                  
			cache_key=f"done_{done.routeId}"
			cache_key_achievement=f"achievement_undo:{token['id']}"      
			rd.delete(cache_key)
			rd.delete(cache_key_achievement)
            
	
			print(f"deldete achievement_undo:{token['id']} and done cache")               
                     

			return {"ok":True}
		else:
			sql="""
			Update achievement 
            SET type =%s
            WHERE routeId=%s AND memberId=%s      
			"""
			val=(done.type, done.routeId, token["id"])
			mycursor.execute(sql,val)
			db.commit()
                  
			cache_key_achievement=f"achievement_undo:{token['id']}"
			rd.delete(cache_key_achievement)      
			# cache_key=f"done_{done.routeId}"
			# rd.delete(cache_key)
			# print("delete done cache")
                              
			return{"ok":False}
	
	except Exception as e:
		print(f"Error occurred: {e}") 
		return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
	finally:
		mycursor.close()
		db.close()


@router.get("/api/done/{routeId}",tags=["Record"])
async def getMemberRoute(routeId:int):
    cache_key=f"done_{routeId}"
    cached_done = rd.get(cache_key)
    if cached_done:
          print("done list: cache hit")
          json_data=json.loads(cached_done)
          return {"data":json_data}
    try:
        print("done list: cache missed")
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql ="""
			SELECT
				m.username,
				m.gender,
				m.height,
				m.grade,
				a.type,
				a.date,
                m.memberId  
			FROM
				achievement a
			INNER JOIN
				member m
			ON
				a.memberId = m.memberId
			WHERE
				a.routeId=%s;
		"""
        val=routeId
        mycursor.execute(sql,(val,))
        results=mycursor.fetchall()

        if results is None:
           return{"data":None}

        else:
            allMembers = []
            for result in results:
                data = {
                      
                    "name": result[0],
                    "gender": result[1],
                    "height": result[2],
                    "grade": result[3],
                    "type": result[4],
                    "date": result[5],
                    "memberId":result[6]
                }
                allMembers.append(data)  # This should be inside the for loop
        
        rd.set(cache_key, json.dumps(allMembers,cls=CustomJSONEncoder), ex=600)    
        return {"data": allMembers}



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


@router.get("/api/route/{routeId}/video",tags=["Record"])
async def get_video(routeId:int):
    print(routeId)
    
    cache_key = f"videos_{routeId}"
    
    cached_videos = rd.get(cache_key)
    if cached_videos:
        print("Videos: Cache hit")
        videos = json.loads(cached_videos)  # Deserialize JSON data
        return {"videos": videos}
    
    if routeId:
        try:
            print("Videos: Cache miss")
            db =cnxpool.get_connection()
            mycursor = db.cursor(dictionary=True)  # Use dictionary=True to get results as dictionaries
            sql = """
            SELECT * 
			FROM video 
			WHERE route_id = %s 
				AND mpd_url != 'waiting'
            ORDER BY video_id DESC;             
            """ 
            #'waiting' to make sure in case video transcoding failed, this record won't show. 
            val = (routeId,)
            mycursor.execute(sql, val)
            videos = mycursor.fetchall()
            
            rd.set(cache_key, json.dumps(videos, cls=CustomJSONEncoder), ex=3600)
            return {"videos": videos}              

        except Error as e:
            print(f"Error: {e}")
        
        finally:
            if db.is_connected():
                mycursor.close()
                db.close()
    else:
        raise HTTPException(status_code=400, detail="Invalid routeId")
    
