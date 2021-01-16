build:
	docker build -t deploy-cpl .
build-nocache:
	docker build --nocache -t deploy-cpl .
clean:
	docker stop deploy-cpl
	docker rm deploy-cpl
run:
	docker run -d --name=deploy-cpl -p 3000:3000 deploy-cpl
run-single:
	docker run --rm deploy-cpl
run-terminal:
	docker run -it --rm deploy-cpl bash
