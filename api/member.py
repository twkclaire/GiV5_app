from fastapi import *
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool, rd
from datetime import date, datetime
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from api.auth import decodeJWT
import json

# load_dotenv()
router=APIRouter()


class DeleteRoute(BaseModel):
	memberId:int
	routeId:int

class CustomJSONEncoder(json.JSONEncoder):
    """JSON Encoder that converts dates and datetimes to ISO format."""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


@router.get("/api/member/{memberId}",tags=["Member"])
async def getMember(memberId:int, token: dict = Depends(decodeJWT)):
        if isinstance(token, JSONResponse):
              return token
        
        frontend_memberId=token["id"]
        if frontend_memberId != memberId:
              raise HTTPException(status_code=403, detail="Access forbidden")
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
				COUNT(a.routeId) - SUM(a.type) AS flash_count,
                SUM(a.type) AS done_count         
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
async def getMemberRoute(memberId:int, token: dict = Depends(decodeJWT)):
    if isinstance(token, JSONResponse):
          return token
    
    frontend_memberId=token["id"]
    if frontend_memberId != memberId:
          return RedirectResponse(url=f"/member/{frontend_memberId}")
    
    cache_key = f"saved_routes_{memberId}"
    
    # Check the cache first
    cached_routes = rd.get(cache_key)
    if cached_routes:
        print("saved_route: Cache hit")
        return {"data": json.loads(cached_routes)}
    
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

        if not results:
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

            rd.set(cache_key, json.dumps(allRoutes, cls=CustomJSONEncoder), ex=600)

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
        
        cache_key = f"saved_routes_{route.memberId}"
        rd.delete(cache_key)

        return {"ok": True}

    except Exception as e:
        print(f"Error occurred: {e}")
        return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "details": str(e)})
    finally:
        if mycursor:
            mycursor.close()
        if db:
            db.close()

#member info
@router.get("/api/data/{memberId}", tags=["Member"])
async def get_member_data(memberId: int, token: dict = Depends(decodeJWT)):
    if isinstance(token, JSONResponse):
          return token
    
    frontend_memberId=token["id"]
    if frontend_memberId != memberId:
          raise HTTPException(status_code=403, detail="Access forbidden")


    try:
        db = cnxpool.get_connection()
        mycursor = db.cursor(dictionary=True)

        # Monthly achievements query
        monthly_sql = """
		SELECT
			SUM(CASE WHEN type = 0 THEN 1 ELSE 0 END) AS type_0_count,
			SUM(CASE WHEN type = 1 THEN 1 ELSE 0 END) AS type_1_count
		FROM achievement
		WHERE memberId = %s
		AND type IN (0, 1)
		AND date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
		AND date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY);
        """
        mycursor.execute(monthly_sql, (memberId,))
        monthly_result = mycursor.fetchone()

        # All-time achievements by grade query
        all_time_sql = """
        SELECT
            r.grade,
            SUM(CASE WHEN a.type = 0 THEN 1 ELSE 0 END) AS type_0_count,
            SUM(CASE WHEN a.type = 1 THEN 1 ELSE 0 END) AS type_1_count
        FROM achievement a
        JOIN route r ON a.routeId = r.routeId
        WHERE a.memberId = %s
        GROUP BY r.grade;
        """
        mycursor.execute(all_time_sql, (memberId,))
        all_time_results = mycursor.fetchall()

        # monthly results
        monthly_data = {
            "flash": monthly_result["type_0_count"] if monthly_result else 0,
            "done": monthly_result["type_1_count"] if monthly_result else 0
        }

        # all-time results
        all_time_data = {}
        for row in all_time_results:
            grade = row["grade"]
            all_time_data[grade] = {
                "flash": row["type_0_count"],
                "done": row["type_1_count"]
            }

        # Ensure all expected grades are included
        expected_grades = [f"V{i}" for i in range(1, 9)]  
        for grade in expected_grades:
            if grade not in all_time_data:
                all_time_data[grade] = {"flash": 0, "done": 0}

        return {
            "data": {
                "monthly_achievement": monthly_data,
                "all_time_achievement": all_time_data
            }
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": f"Internal Server Error: {str(e)}"
            }
        )
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()



@router.get("/api/achievement/{memberId}", tags=["achievement"])
async def get_member_achievement(memberId: int, token:dict = Depends(decodeJWT)):
    if isinstance(token, JSONResponse):
      return token
    
    try:
        db = cnxpool.get_connection()
        mycursor = db.cursor(dictionary=True)

        # Monthly achievements query
        sql = """
        SELECT 
            a.memberId,
            a.routeId,
            r.name,
            r.grade,
            r.available,
            a.type,
            a.date
        FROM 
            achievement a
        INNER JOIN 
            route r ON a.routeId = r.routeId
        WHERE 
            a.memberId = %s
        ORDER BY 
            a.date DESC;
        """
        mycursor.execute(sql, (memberId,))
        results = mycursor.fetchall()

        sql="SELECT username FROM member WHERE memberId= %s"
        mycursor.execute(sql,(memberId,))
        name= mycursor.fetchone()
        frontend_memberId=token["id"]
        if frontend_memberId == memberId:
            return {"data":results, "undo": True, "name":name}
        else:
            
            return{"data":results, "undo": False, "name": name}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": f"Internal Server Error: {str(e)}"
            }
        )
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()


class DeleteAchievementRequest(BaseModel):
    memberId: int
    routeId: int   

@router.delete("/api/achievement/delete", tags=["achievement"])
async def delete_achievement(request: DeleteAchievementRequest, token:dict = Depends(decodeJWT)):
    if isinstance(token, JSONResponse):
      return token
    
    memberId = request.memberId
    routeId = request.routeId
    print("I got these from front end:", memberId, routeId)
    try:
        db = cnxpool.get_connection()
        mycursor = db.cursor(dictionary=True)

        # Monthly achievements query
        sql = """
        DELETE FROM achievement 
        WHERE memberId=%s AND routeId=%s
        """
        mycursor.execute(sql, (memberId, routeId))
        db.commit()

        if mycursor.rowcount ==0:
              raise HTTPException(status_code=404, detail="Record not found")

        return {"ok":True}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": f"Internal Server Error: {str(e)}"
            }
        )
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()