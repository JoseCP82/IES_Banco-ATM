data: contiene archivos de personalización del contenedor
 - data/.env: archivo que contiene la personalización de las variables de entorno 	de la aplicación.
 	API_URL="https://developodo.io"  //url api
	ATM_ID="2222"  //identificador númerico del cajero

data/nginx: contiene archivos de personalización del servicio web
	- data/nginx/conf/nginx.conf: contiene la configuración de nginx
	Si empleamos proxy para acceder al back:
		/api/ -> tendremos que configurar nuestra variable de entorno API_URL a https://localhost/api
		y proxy_pass tendrá el valor real de la ip del servidor.
	Ojo con server_name y los certificados

data/nginx/ssl: contiene los certificados del servidor para https.

Para levantar el contenedor, tan solo ejecutar en esta carpeta:
docker-compose up