sudo apt-get update
sudo apt-get install -yq ca-certificates git build-essential supervisor --assume-yes
sudo apt-get install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libatk-bridge2.0-0 libgbm-dev --assume-yes

# Install logging monitor. The monitor will automatically pick up logs sent to
# syslog.
sudo curl -s "https://storage.googleapis.com/signals-agents/logging/google-fluentd-install.sh" | bash
sudo service google-fluentd restart &

# install node
mkdir /opt/nodejs
curl https://nodejs.org/download/release/latest-v16.x/node-v16.14.2-linux-x64.tar.gz | tar xvzf - -C /opt/nodejs --strip-components=1
ln -s /opt/nodejs/bin/node /usr/bin/node
ln -s /opt/nodejs/bin/npm /usr/bin/npm

# install gpu drivers
curl https://raw.githubusercontent.com/GoogleCloudPlatform/compute-gpu-installation/main/linux/install_gpu_driver.py --output install_gpu_driver.py
sudo python3 install_gpu_driver.py

# pull code from repo
cd ~
git clone https://github.com/rvk86/gifserver.git /opt/app/gifserver
cd gifserver
npm install
npx tsc

# Create a nodeapp user. The application will run as this user.
useradd -m -d /home/nodeapp nodeapp
chown -R nodeapp:nodeapp /opt/app/gifserver

# Configure supervisor to run the node app.
cat >/etc/supervisor/conf.d/node-app.conf <<EOF
[program:nodeapp]
directory=/opt/app/gifserver
command=npm start
autostart=true
autorestart=true
user=nodeapp
stdout_logfile=syslog
stderr_logfile=syslog
EOF

supervisorctl reread
supervisorctl update
