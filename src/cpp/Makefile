CXX := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra -pedantic -Iinclude

.PHONY: test clean wasm

test:
	mkdir -p build
	$(CXX) $(CXXFLAGS) tests/test_dsa_suite.cpp -o build/test_dsa_suite
	./build/test_dsa_suite

wasm:
	mkdir -p build
	em++ -std=c++17 -O3 -Iinclude src/WorkbenchEngine.cpp -s WASM=1 -o build/workbench_core.js

clean:
	rm -rf build
