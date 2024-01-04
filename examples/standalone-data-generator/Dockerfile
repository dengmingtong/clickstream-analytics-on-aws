# run below command on M1 mac to build image for linux/amd64
FROM --platform=linux/amd64 python:3-alpine   

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set the default command to run when the container starts
CMD ["python", "create_event_real_time.py"]