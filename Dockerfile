FROM node:14.15-stretch
WORKDIR /opt/deploy-cpl
RUN apt-get update && apt-get install -y git
RUN apt install --quiet nano
RUN npm init -y
RUN npm install --quiet -g expo-cli@4.9.1
RUN npm install --quiet --save express
RUN npm install --quiet --save express-basic-auth
RUN npm install --quiet --save express-fileupload
RUN npm install sqlite3 --build-from-source
RUN git clone https://github.com/pausabe/cpl-app cpl-app\
    && cd cpl-app\
    && git checkout master\
    && cd .. \
    && git clone https://github.com/pausabe/cpl-app cpl-app-test\
    && cd cpl-app-test\
    && git checkout master\
    && cd .. \

WORKDIR /opt/deploy-cpl/cpl-app
RUN npm install
RUN expo install react-native-safe-area-context
WORKDIR /opt/deploy-cpl

RUN mkdir /opt/deploy-cpl/database
RUN mkdir /opt/deploy-cpl/database-test
RUN mkdir /opt/usb

COPY deploy-cpl.sh .
COPY index.js .
COPY Services/ ./Services
COPY Utils/ ./Utils
COPY index.html .
COPY /db/cpl-app.db ./cpl-app/src/Assets/db/
COPY /db/cpl-app.db ./database/
COPY /db/cpl-app.db ./database-test/
COPY UpdateAppRepository.sh .

EXPOSE 3000

CMD ["node", "index.js"]
