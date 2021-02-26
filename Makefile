build:
	docker build -t deploy-cpl .
build-no-cache:
	docker build --no-cache -t deploy-cpl .
clean:
	docker stop deploy-cpl
	docker rm deploy-cpl
run:
	docker run -d --name=deploy-cpl -p 3000:3000 --env-file secrets.env deploy-cpl -v /mnt/usb:/opt/usb
run-single:
	docker run --rm deploy-cpl
run-terminal:
	docker run -it --rm deploy-cpl bash
run-terminal-devops:
	docker run -it --rm -p 19000:19000 -p 19001:19001 -p 19002:19002 -p 19006:19006 --env EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 deploy-cpl bash
