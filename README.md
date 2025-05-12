## COMPATIBILITY
Only tested on Linux. Should work anywhere theorethically.

## INSTALLATION
Clone the repository:
```
git clone https://github.com/riccardoluongo/saving/
cd saving
```

Create the directories for logs and the database:
```
mkdir -p log/main
mkdir -p log/access
mkdir database
```

Generate a secure secret key for Flask and add it to the .env file (you will need to create it):
```
openssl rand -base64 32
```

Edit the file and add this line with your key at the end:
```
SECRET_KEY= #your key here
```

Create and activate a python virtual environment:
```
python3 -m venv venv
venv/bin/activate
```

Install the required packages:
```
python3 -m pip install -r requirements.txt
```

## STARTING
This program uses a systemd service to automatically start at boot.

If you wish to run manually, run:
```
gunicorn -w {N_WORKERS} main:app --access-logfile 'log/access/access.log' -b 0.0.0.0:{YOUR_PORT}
```
replacing N_WORKERS with the number of gunicorn workers you wish to use, and PORT with your desired port.
A recommended number of workers is (cpu_cores * 2). Using a higher number will lead to better performance at the cost of higher memory usage.

To install as a systemd service, edit saving.service replacing the values shown before and copy the file in the appropriate systemd directory:
```
cp saving.service /etc/systemd/system/
```
And enable the service:
```
systemctl enable saving
systemctl start saving
```
