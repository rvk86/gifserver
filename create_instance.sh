# NOT SURE IF THIS WORKS. IN THE INTERFACE YOU NEED TO SELECT EPHEMERAL IP FOR IT TO WORK
gcloud compute instance-templates create {GIFMAKER_TEMPLATE} \
    --project=mapmaker-330220 \
    --machine-type=n1-standard-2 \
    --network-interface=network=default,network-tier=PREMIUM \
    --metadata=startup-script=set\ -v$'\n'$'\n'sudo\ apt-get\ update$'\n'sudo\ apt-get\ install\ -yq\ ca-certificates\ git\ build-essential\ supervisor\ libglvnd-dev\ pkg-config\ --assume-yes$'\n'sudo\ apt-get\ install\ gconf-service\ libasound2\ libatk1.0-0\ libc6\ libcairo2\ libcups2\ libdbus-1-3\ libexpat1\ libfontconfig1\ libgcc1\ libgconf-2-4\ libgdk-pixbuf2.0-0\ libglib2.0-0\ libgtk-3-0\ libnspr4\ libpango-1.0-0\ libpangocairo-1.0-0\ libstdc\+\+6\ libx11-6\ libx11-xcb1\ libxcb1\ libxcomposite1\ libxcursor1\ libxdamage1\ libxext6\ libxfixes3\ libxi6\ libxrandr2\ libxrender1\ libxss1\ libxtst6\ ca-certificates\ fonts-liberation\ libappindicator1\ libnss3\ lsb-release\ xdg-utils\ wget\ libatk-bridge2.0-0\ libgbm-dev\ --assume-yes$'\n'sudo\ apt\ install\ -y\ libx11-xcb1\ libxcomposite1\ libxcursor1\ libxdamage1\ libxi-dev\ libxtst-dev\ libnss3\ libcups2\ libxss1\ libxrandr2\ libasound2\ libatk1.0-0\ libatk-bridge2.0-0\ libpangocairo-1.0-0\ libgtk-3-0\ libgbm1\ --assume-yes$'\n'$'\n'\#\ Install\ logging\ monitor.\ The\ monitor\ will\ automatically\ pick\ up\ logs\ sent\ to$'\n'\#\ syslog.$'\n'sudo\ curl\ -s\ \"https://storage.googleapis.com/signals-agents/logging/google-fluentd-install.sh\"\ \|\ bash$'\n'sudo\ service\ google-fluentd\ restart\ \&$'\n'$'\n'\#\ install\ node$'\n'mkdir\ /opt/nodejs$'\n'curl\ https://nodejs.org/download/release/latest-v16.x/node-v16.14.2-linux-x64.tar.gz\ \|\ tar\ xvzf\ -\ -C\ /opt/nodejs\ --strip-components=1$'\n'ln\ -s\ /opt/nodejs/bin/node\ /usr/bin/node$'\n'ln\ -s\ /opt/nodejs/bin/npm\ /usr/bin/npm$'\n'$'\n'\#\ install\ gpu\ drivers$'\n'curl\ -O\ https://storage.googleapis.com/nvidia-drivers-us-public/GRID/GRID13.0/NVIDIA-Linux-x86_64-470.63.01-grid.run$'\n'sudo\ bash\ NVIDIA-Linux-x86_64-470.63.01-grid.run\ -s$'\n'$'\n'\#\ pull\ code\ from\ repo$'\n'git\ clone\ https://github.com/rvk86/gifserver.git\ /opt/app/gifserver$'\n'cd\ /opt/app/gifserver$'\n'npm\ install$'\n'npm\ run\ build$'\n'$'\n'\#\ Create\ a\ nodeapp\ user.\ The\ application\ will\ run\ as\ this\ user.$'\n'useradd\ -m\ -d\ /home/nodeapp\ nodeapp$'\n'chown\ -R\ nodeapp:nodeapp\ /opt/app/gifserver$'\n'$'\n'\#\ Configure\ supervisor\ to\ run\ the\ node\ app.$'\n'cat\ \>/etc/supervisor/conf.d/node-app.conf\ \<\<EOF$'\n'\[program:nodeapp\]$'\n'directory=/opt/app/gifserver$'\n'command=npm\ start$'\n'autostart=true$'\n'autorestart=true$'\n'user=nodeapp$'\n'stdout_logfile=syslog$'\n'stderr_logfile=syslog$'\n'EOF$'\n'$'\n'supervisorctl\ reread$'\n'supervisorctl\ update \
    --no-restart-on-failure \
    --maintenance-policy=TERMINATE \
    --preemptible \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --service-account=firebase-adminsdk-uppld@mapmaker-330220.iam.gserviceaccount.com \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --accelerator=count=1,type=nvidia-tesla-t4 \
    --tags=http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=gifmaker,image=projects/ubuntu-os-cloud/global/images/ubuntu-1804-bionic-v20220419,mode=rw,size=10,type=pd-balanced \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --reservation-affinity=any

gcloud compute instance-groups managed create {GIFMAKERS} \
    --project=mapmaker-330220 \
    --base-instance-name={GIFMAKERS} \
    --size=1 \
    --template={GIFMAKER_TEMPLATE} \
    --zone=us-central1-a

gcloud compute instance-groups managed set-named-ports {GIFMAKERS} \
    --project=mapmaker-330220 \
    --zone=us-central1-a \
    --named-ports=http-server:8080

gcloud beta compute instance-groups managed set-autoscaling {GIFMAKERS} \
    --project=mapmaker-330220 \
    --zone=us-central1-a \
    --cool-down-period=60 \
    --max-num-replicas=10 \
    --min-num-replicas=1 \
    --mode=off \
    --target-cpu-utilization=0.6

gcloud compute firewall-rules create default-allow-http-8080 \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow port 8080 access to http-server"

# ALSO CREATE LOAD BALANCER
