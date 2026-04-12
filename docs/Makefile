.PHONY: install build clean open

install:
	npm i -g @antora/cli@3.1 @antora/site-generator@3.1

build:
	npx antora --fetch site.yml

clean:
	rm -rf www .cache

open: build
	@if [ "$$(uname)" = "Darwin" ]; then \
		open www/modules/index.html; \
	else \
		xdg-open www/modules/index.html; \
	fi
