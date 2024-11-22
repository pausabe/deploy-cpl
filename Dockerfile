FROM node:18-bullseye
WORKDIR /opt/deploy-cpl
RUN apt-get update && apt-get install -y git
RUN apt install --quiet nano
RUN npm init -y
RUN npm install expo@51.0.39 --save
RUN npx expo install expo-splash-screen@0.29.13
RUN npx expo install expo-system-ui
RUN npx expo install expo-updates
RUN npm install --quiet -g eas-cli@13.2.3
RUN npm install --quiet --save express
RUN npm install --quiet --save express-basic-auth
RUN npm install --quiet --save express-fileupload
RUN npm install sqlite3 --build-from-source
RUN git clone https://github.com/pausabe/cpl-app cpl-app\
    && cd cpl-app\
    && git checkout master\
    && git pull\
    && cd .. \
    && git clone https://github.com/pausabe/cpl-app cpl-app-test\
    && cd cpl-app-test\
    && git checkout master\
    && git pull\
    && cd ..

WORKDIR /opt/deploy-cpl/cpl-app
RUN npm install
WORKDIR /opt/deploy-cpl

WORKDIR /opt/deploy-cpl/cpl-app-test
RUN npm install
WORKDIR /opt/deploy-cpl

RUN mkdir /opt/usb

COPY scripts/deploy-cpl.sh .
COPY scripts/UpdateAppRepository.sh .
COPY scripts/update-dependencies.sh .
COPY index.js .
COPY Services/ ./Services
COPY Utils/ ./Utils
COPY index.html .
COPY /db/cpl-app.db ./cpl-app/src/Assets/db/
COPY /db/cpl-app.db ./cpl-app-test/src/Assets/db/

EXPOSE 3000

CMD ["node", "index.js"]
