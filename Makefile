.PHONY: all
all: install build

install:
	npm install

%:
	npm run-script $@
