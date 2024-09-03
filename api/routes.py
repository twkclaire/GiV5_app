from fastapi import * 
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool, rd
from typing import Optional
import json
import requests
from datetime import date, datetime

router=APIRouter()


class CustomJSONEncoder(json.JSONEncoder):
    """JSON Encoder that converts dates and datetimes to ISO format."""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)
    
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


@router.get("/api/route/stats", tags=["Route"])
def getStats():

    # cache_key="route_count"
    # cache = rd.get(cache_key)
    # if cache:
    #     print("cache hit")
    #     return json.loads(cache)
    # else:
        try:
            # print("cache miss")
            db =cnxpool.get_connection()
            mycursor = db.cursor()
            sql ="""
                SELECT 
                    routeId,
                    COUNT(*) AS record_count
                FROM achievement
                WHERE 
                    YEAR(date) = YEAR(CURRENT_DATE) 
                    AND MONTH(date) = MONTH(CURRENT_DATE)
                GROUP BY routeId
                ORDER BY record_count DESC
                LIMIT 1;

            """
            mycursor.execute(sql,)
            routes=mycursor.fetchone()
            print(routes)

            # rd.set(cache_key,json.dumps(result))
            return routes
                
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




@router.get("/api/routes", tags=["Route"])
async def getRoutes(page: int= Query(...,gt=-1), keyword: Optional[str] = None):
    cache_key = f"routes_page_{page}_keyword_{keyword}"
    cached_data = rd.get(cache_key)

    if cached_data:
        print("cache hit")
        return json.loads(cached_data)
    

    if page ==0:
        start=0
    else:
        start =(page -1)* 8 +8

    try:
        print("cache miss")
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
            # print(results)

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
                "date":result[2].isoformat(),
                "expired":result[3],
                "grade":result[4],
                "available":result[5],
                "done":result[6]
            }
            allRoutes.append(data)
        
            nextPage = page + 1 if num_results == 9 else None
        print("this is all routes:", allRoutes)
        response_data={"nextPage":nextPage, "data":allRoutes}
        rd.set(cache_key, json.dumps(response_data,cls=CustomJSONEncoder), ex=86400)

        return response_data


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
    cache_key="route_count"
    cache = rd.get(cache_key)
    if cache:
        print("cache hit")
        return json.loads(cache)
    else:
        try:
            print("cache miss")
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
            rd.set(cache_key,json.dumps(result))
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
    cache_key =f"route_{routeID}"

    cached_route =rd.get(cache_key)
    if cached_route:
        print("cache hit")
        return json.loads(cached_route)
    
    try:
        print("cache missed")
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
                "date": route[2].isoformat(),
                "expired":route[3],
                "grade":route[4],
                "available":route[5],
                "flash":route[6],
                "done":route[7],
            }
        rd.set(cache_key, json.dumps(data,cls=CustomJSONEncoder), ex=86400)    
        return data
            
    except Exception as e:
        print(f"An error occurred: {str(e)}")
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



