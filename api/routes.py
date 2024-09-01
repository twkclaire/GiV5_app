from fastapi import * 
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool, rd
from typing import Optional
import json
import requests

router=APIRouter()

@router.get("/redis_test")
def getRoute():
    cache_key = "redis_test"
    cache = rd.get(cache_key)

    if cache:
        print("cache hit")
        return json.loads(cache)
    else:
        print("cache missed")
        r= requests.get("https://padax.github.io/taipei-day-trip-resources/taipei-attractions-assignment-1")
        rd.set(cache_key,r.text)
        return r.json()


@router.get("/api/routes", tags=["Route"])
async def getRoutes(page: int= Query(...,gt=-1), keyword: Optional[str] = None):
    if page ==0:
        start=0
    else:
        start =(page -1)* 8 +8

    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()

        if keyword is None:

            # sql ="SELECT * FROM route LIMIT 9 OFFSET %s"
            sql="""
            SELECT 
                r.routeId,
                r.name,
                r.date,
                r.expired,
                r.grade,
                r.available,
                COALESCE(COUNT(CASE WHEN a.type = 1 THEN 1 END), 0) AS type_1_count
            FROM 
                route r
            LEFT JOIN 
                achievement a ON r.routeId = a.routeId
            WHERE 
                r.available = 1    
            GROUP BY 
                r.routeId
            LIMIT 9 OFFSET %s;

            """
            mycursor.execute(sql,(start,))
            results=mycursor.fetchall()
            num_results=len(results)
            print(results)

        else: 
            # sql ="SELECT * FROM route WHERE name LIKE %s OR routeId =%s LIMIT 9 OFFSET %s" 
            sql="""
            SELECT 
                r.routeId,
                r.name,
                r.date,
                r.expired,
                r.grade,
                r.available,
                COALESCE(COUNT(CASE WHEN a.type = 1 THEN 1 END), 0) AS type_1_count
            FROM 
                route r
            LEFT JOIN 
                achievement a ON r.routeId = a.routeId
            WHERE 
                r.available = 1 AND (r.name LIKE %s OR r.routeId = %s OR r.grade = %s)
            GROUP BY 
                r.routeId
            LIMIT 9 OFFSET %s;
            """
            sql_data=["%"+keyword+"%",keyword, keyword,start]
            mycursor.execute(sql,sql_data)
            results=mycursor.fetchall()
            num_results=len(results)

        allRoutes=[]
        for result in results:
            data={
                "routeID":result[0],
                "name":result[1],
                "date":result[2],
                "expired":result[3],
                "grade":result[4],
                "available":result[5],
                "done":result[6]
            }
            allRoutes.append(data)
        
        if num_results ==9:
            nextPage=page+1
        else:
            nextPage=None
        return{"nextPage":nextPage, "data":allRoutes}


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

@router.get("/api/route/count",tags=["Route"])
async def countRoutes():
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql ="SELECT grade, COUNT(*) AS count FROM route WHERE available=1 GROUP BY grade;"
        mycursor.execute(sql,)
        routes=mycursor.fetchall()
        print(routes)
        result=[]
        for route in routes:
            data={
                "grade":route[0],
                "count":route[1]
            }
            result.append(data)
        return result
            
    except Exception:
        return JSONResponse(
			status_code=500,
			content={
				"error":True,
				"message":"Internal Server Error"
			}
		)      
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()    




@router.get("/api/route/{routeID}",tags=["Route"])
async def getRoutes(routeID:int):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        # sql ="SELECT * FROM route where routeId=%s"
        sql="""
        SELECT
            r.routeId,
            r.name,
            r.date,
            r.expired,
            r.grade,
            r.available,
            COUNT(CASE WHEN a.type = 0 THEN 1 END) AS count_type_0,
            COUNT(CASE WHEN a.type = 1 THEN 1 END) AS count_type_1
        FROM
            route r
        LEFT JOIN
            achievement a ON r.routeId = a.routeId
        WHERE
            r.routeId = %s
        GROUP BY
            r.routeId, r.name, r.date, r.expired, r.grade, r.available;

        """
        val=(routeID,)
        mycursor.execute(sql,val)
        route=mycursor.fetchone()
        if route:
            data={
                "routeID":route[0],
                "name":route[1],
                "date":route[2],
                "expired":route[3],
                "grade":route[4],
                "available":route[5],
                "flash":route[6],
                "done":route[7],
            }
        return data
            
    except Exception:
        return JSONResponse(
			status_code=500,
			content={
				"error":True,
				"message":"Internal Server Error"
			}
		)             
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()    



