from fastapi import *
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool
from typing import Optional
from datetime import date
from mysql.connector import Error


router=APIRouter()


class DeleteRoute(BaseModel):
	memberId:int
	routeId:int
      
class RouteSave(BaseModel):
	memberId:int
	routeId:int


class DoneRoute(BaseModel):
	memberId:int
	routeId:int
	type: int
	completed_date:Optional[date]=None

@router.post("/api/save", tags=["Record"])
async def savedRoute(route:RouteSave):
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		sql_check="""
		SELECT * FROM savedRoute WHERE memberId=%s AND routeId=%s 
		"""
		val_check=(route.memberId, route.routeId)
		mycursor.execute(sql_check,val_check)
		result=mycursor.fetchone()
		if result is None:
			sql="""
			INSERT INTO savedRoute (memberId, routeId)
			VALUES (%s, %s)
			"""
			val=(route.memberId, route.routeId)
			mycursor.execute(sql,val)
			db.commit()
			return {"ok":True}
		else:
			return{"ok":False}
	
	except Exception as e:
		print(f"Error occurred: {e}") 
		return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
	finally:
		mycursor.close()
		db.close()







@router.put("/api/save", tags=["Record"])
async def deleteSavedRoute(route: DeleteRoute):
    try:
        db = cnxpool.get_connection()
        mycursor = db.cursor()
        
        sql_check = """
        DELETE FROM savedRoute WHERE memberId=%s AND routeId=%s;
        """
        val_check = (route.memberId, route.routeId)
        mycursor.execute(sql_check, val_check)
        db.commit()
        
        #check if delete succesfully 
        if mycursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"error": True, "message": "Record not found"})

        return {"ok": True}

    except Exception as e:
        print(f"Error occurred: {e}")
        return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
    finally:
        if mycursor:
            mycursor.close()
        if db:
            db.close()



@router.post("/api/done",tags=["Record"])
async def routeDone(done:DoneRoute):
	print("this is what I got from the front:",done)
	try: 
		db =cnxpool.get_connection()
		mycursor = db.cursor()
		sql_check="""
		SELECT * FROM achievement WHERE memberId=%s AND routeId=%s 
		"""
		val_check=(done.memberId, done.routeId)
		mycursor.execute(sql_check,val_check)
		result=mycursor.fetchone()
		if result is None:
			sql="""
			INSERT INTO achievement (memberId, routeId, type)
			VALUES (%s, %s, %s)
			"""
			val=(done.memberId, done.routeId, done.type)
			mycursor.execute(sql,val)
			db.commit()

			return {"ok":True}
		else:
			sql="""
			Update achievement 
            SET type =%s
            WHERE routeId=%s AND memberId=%s      
			"""
			val=(done.type, done.routeId, done.memberId)
			mycursor.execute(sql,val)
			db.commit()
                              
			return{"ok":False}
	
	except Exception as e:
		print(f"Error occurred: {e}") 
		return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
	finally:
		mycursor.close()
		db.close()


@router.get("/api/done/{routeId}",tags=["Record"])
async def getMemberRoute(routeId:int):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql ="""
			SELECT
				m.username,
				m.gender,
				m.height,
				m.grade,
				a.type,
				a.date
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
                    "date": result[5]
                }
                allMembers.append(data)  # This should be inside the for loop

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
    if routeId:
        try:
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
            
            return {"videos": videos}              

        except Error as e:
            print(f"Error: {e}")
        
        finally:
            if db.is_connected():
                mycursor.close()
                db.close()
    else:
        raise HTTPException(status_code=400, detail="Invalid routeId")
    
