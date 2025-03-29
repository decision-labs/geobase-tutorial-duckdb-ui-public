In this tutorial I will show you how to use DuckDB UI to create a database and a table. Then store that in motherduck. Then we will access that table from geobase to build a full stack javascript app.

So let's get started!

## Create a database and a table


```sql
INSTALL spatial;
LOAD spatial;
```

Let's take a look at the data we are going to use. The data is a geoparquet file that contains a grid of hexagons representing cartio vascular health.

https://emotional.byteroad.net/collections/ec_catalog/items/hex350_grid_cardio_1920?f=html

>  The mapping results of urban health outcomes (Prevalence rates of cardiovascular diseases) in 350m hexagonal grids of Inner London

```sql
select 
  st_astext(geometry) 
  from 'https://emotional-cities.s3.eu-central-1.amazonaws.com/geoparquet/hex350_grid_cardio_1920.parquet' limit 10;
```

```sql
-- load data into a table
create table hex350_grid_cardio_1920 AS 
  SELECT * EXCLUDE geometry, ST_GeomFromText(st_astext(geometry)) AS geometry
  FROM 'https://emotional-cities.s3.eu-central-1.amazonaws.com/geoparquet/hex350_grid_cardio_1920.parquet'
```

```sql
select
	fid,
	Col_ID,
	Row_ID,
	Hex_ID,
	Centroid_X,
	Centroid_Y,
	area,
	wprev_mean,
	wprev_majority,
    st_astext(geometry) 
  from hex350_grid_cardio_1920
limit 100;
```

```sql
-- create a view
select count(*) from hex350_grid_cardio_1920;
```

----

Create the duckdb_fdw server and connect to the motherduck database. Follow the instructions in the video tutorial.

After you have the table loaded from motherduck into geobase you can run the following queries to create the backend for the frontend.

```sql
create materialized view
  public.hex350_grid_cardio_view as
select
  hex350_grid_cardio_1920.fid,
  hex350_grid_cardio_1920."Col_ID" as col_id,
  hex350_grid_cardio_1920."Row_ID" as row_id,
  hex350_grid_cardio_1920."Hex_ID" as hex_id,
  hex350_grid_cardio_1920."Centroid_X" as centroid_x,
  hex350_grid_cardio_1920."Centroid_Y" as centroid_y,
  hex350_grid_cardio_1920.area,
  hex350_grid_cardio_1920.wprev_mean,
  hex350_grid_cardio_1920.wprev_majority,
  st_geometryn (
    st_geomfromtext (hex350_grid_cardio_1920.wkt::text, 4326)::geometry (MultiPolygon, 4326),
    1
  )::geometry (polygon, 4326) as geom
from
  hex350_grid_cardio_1920;
```

```sql
-- add a spatial index
create index hex350_grid_cardio_view_geom_idx on hex350_grid_cardio_view using GIST (geom);
```

```sql
-- query the view
select count(*) from hex350_grid_cardio_view;
```

```sql
-- create function to get statistics
-- Supabase AI is experimental and may produce incorrect answers
-- Always verify the output before executing

-- Supabase AI is experimental and may produce incorrect answers
-- Always verify the output before executing

create
or replace function get_wprev_statistics () returns table (
  min_value numeric,
  max_value numeric,
  mean_value numeric,
  median_value numeric,
  std_dev_value numeric
) as $$
begin
  return query
  select
    min(wprev_mean)::numeric as min_value,
    max(wprev_mean)::numeric as max_value,
    avg(wprev_mean)::numeric as mean_value,
    percentile_cont(0.5) within group (
      order by
        wprev_mean
    )::numeric as median_value,
    stddev(wprev_mean)::numeric as std_dev_value
  from
    hex350_grid_cardio_view;
end;
$$ language plpgsql;

select
  *
from
  get_wprev_statistics ();
```



new function to get stats by bounding box
```sql
create or replace function get_wprev_statistics_by_bbox(
  min_x float,
  min_y float,
  max_x float,
  max_y float
)
returns table (
  min_value numeric,
  max_value numeric,
  mean_value numeric,
  median_value numeric,
  std_dev_value numeric
)
as $$
begin
  return query
  select
    min(wprev_mean)::numeric as min_value,
    max(wprev_mean)::numeric as max_value,
    avg(wprev_mean)::numeric as mean_value,
    percentile_cont(0.5) within group (
      order by
      wprev_mean
    )::numeric as median_value,
    stddev(wprev_mean)::numeric as std_dev_value
  from
    hex350_grid_cardio_view
  where
    geom && st_makeenvelope(min_x, min_y, max_x, max_y, 4326);
end;
$$ language plpgsql
set search_path = public,extensions;

select * from get_wprev_statistics_by_bbox(100, 100, 200, 200);
```


