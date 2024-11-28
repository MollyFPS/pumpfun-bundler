#!/bin/bash

# Clear the screen
clear
echo "Starting PumpFun Bundler..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed!"
    echo "Please install Node.js which includes npm"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing dependencies!"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Start the program
echo "Launching PumpFun Bundler..."
echo
npm start

# If the program exits with an error
if [ $? -ne 0 ]; then
    echo
    echo "Program exited with an error!"
    read -p "Press Enter to exit..."
fi 