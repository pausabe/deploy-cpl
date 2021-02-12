FROM node:14.15-stretch
WORKDIR /opt/deploy-cpl
RUN apt-get update && apt-get install -y git
RUN npm init -y
RUN npm install --quiet -g expo-cli@3.26.0
RUN npm install --quiet --save express
RUN npm install --quiet --save express-basic-auth
RUN npm install --quiet --save express-fileupload
RUN git clone https://github.com/pausabe/cpl-app cpl-app\
    && cd cpl-app\
    && git checkout master\
    && cd ..

WORKDIR /opt/deploy-cpl/cpl-app
RUN npm install
RUN expo install react-native-safe-area-context
WORKDIR /opt/deploy-cpl

COPY deploy-cpl.sh .
COPY index.js .
COPY index.html .
COPY /db/cpl-app.db ./cpl-app/src/Assets/db/

EXPOSE 3000

CMD ["node", "index.js"]
