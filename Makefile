all: install build

install:
	npm install

%:
	npm run-script $@
