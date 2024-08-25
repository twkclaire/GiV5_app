from fastapi import * 
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from database import cnxpool
from typing import Optional

router=APIRouter()


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
                r.name LIKE %s OR r.routeId = %s OR r.grade=%s
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
        sql ="SELECT grade, COUNT(*) AS count FROM route GROUP BY grade;"
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








# @router.get("/api/ranking")
# async def getRanking():
#     try:
#         db=cnxpool.get_connection()
#         mycursor = db.cursor()
#         sql="""
#             SELECT 
#                 m.memberId,
#                 m.name,
#                 SUM(
#                     CASE r.grade
#                         WHEN 'V1' THEN 100
#                         WHEN 'V2' THEN 110
#                         WHEN 'V3' THEN 120
#                         WHEN 'V4' THEN 130
#                         WHEN 'V5' THEN 140
#                         WHEN 'V6' THEN 150
#                         WHEN 'V7' THEN 160
#                         WHEN 'V8' THEN 170
#                         WHEN 'V9' THEN 180
#                     END + 
#                     CASE a.type
#                         WHEN 'flash' THEN 30
#                         ELSE 0
#                     END
#                 ) AS total_points
#             FROM 
#                 achievement a
#             JOIN 
#                 route r ON a.routeId = r.routeId
#             JOIN 
#                 member m ON a.memberId = m.memberId
#             GROUP BY 
#                 m.memberId, m.name
#             ORDER BY 
#                 total_points DESC;
#         """
#         mycursor.execute(sql)
#         results=mycursor.fetchall()
#         print(results)
#         rank=[]
#         start=1
#         for result in results:
#             data={
#                 "place": start,
#                 "name": result[1],
#                 "score": result[2]
#             }
#             rank.append(data)
#             start +=1

#         return rank

#     except Exception:
#         return JSONResponse(
# 				status_code=500,
# 				content={
# 					"error":True,
# 					"message":"Internal Server Error"
# 				}
# 			)
    
#     #[(5, 'Joao', Decimal('920')), (1, 'Claire', Decimal('900')), (4, 'George', Decimal('900')), (2, 'Adam', Decimal('860')), (3, 'Joe', Decimal('860'))]