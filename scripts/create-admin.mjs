import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const [username,password,remoteFlag] = process.argv.slice(2);
if(!username||!password||password.length<14){console.error('Usage: npm run admin:create -- <username> <password-at-least-14-chars> [--remote]');process.exit(1)}
const salt=randomBytes(16);const derived=pbkdf2Sync(password,salt,210000,32,'sha256');const stored=`${salt.toString('base64')}$${derived.toString('base64')}`;
const sql=`INSERT INTO admin_users(id,username,password_hash) VALUES(lower(hex(randomblob(16))), '${username.replaceAll("'","''")}', '${stored}') ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash;`;
const args=['wrangler','d1','execute','forme-production','--command',sql];if(remoteFlag==='--remote')args.push('--remote');else args.push('--local');execFileSync('npx',args,{stdio:'inherit'});
