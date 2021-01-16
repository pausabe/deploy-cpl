FROM node:14.15-stretch
WORKDIR /opt/deploy-cpl
RUN apt-get update && apt-get install -y git
RUN npm init -y
RUN npm install --quiet -g expo-cli@3.26.0 && npm install --save --quiet express
RUN npm install --quiet --save express-basic-auth
RUN git clone https://github.com/pausabe/cpl-app cpl-app\
    && cd cpl-app\
    && git checkout master\
    && cd ..

WORKDIR /opt/deploy-cpl/cpl-app
#Añadir comandos para ejecutar dentro del repositorio de git

WORKDIR /opt/deploy-cpl

COPY deploy-cpl.sh .
COPY index.js .
EXPOSE 3000
#CMD ["node", "index.js"]
CMD ["/bin/sh", "deploy-cpl.sh"]
