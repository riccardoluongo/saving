## WARNING!!
There is no password protection mechanism implemented at the moment (hashing, salting etc..) because I originally made this app for personal use. If you care about your privacy DON'T use the public instance as your passwords will be stored in plain text. Password hashing coming soon!

## COMPATIBILITY
Currently only tested on Linux. Should work anywhere in theory.

## INSTALLATION
Clone the repository:
```
git clone https://github.com/riccardoluongo/saving/
cd saving
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
