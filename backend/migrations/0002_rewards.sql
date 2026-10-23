PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS reward_wallets(user TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,sugar INTEGER NOT NULL DEFAULT 0 CHECK(sugar>=0),scraps INTEGER NOT NULL DEFAULT 0 CHECK(scraps>=0));
CREATE TABLE IF NOT EXISTS reward_claims(game TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,day TEXT NOT NULL,score INTEGER NOT NULL,sugar INTEGER NOT NULL,scraps INTEGER NOT NULL,frosting TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(user,day));
CREATE TABLE IF NOT EXISTS reward_items(user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('buddy','cosmetic')),sugar_cost INTEGER NOT NULL DEFAULT 0 CHECK(sugar_cost>=0),scrap_cost INTEGER NOT NULL DEFAULT 0 CHECK(scrap_cost>=0),request_key TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user,item),UNIQUE(user,request_key));
CREATE TABLE IF NOT EXISTS reward_loadouts(user TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,buddy TEXT,hat TEXT,aura TEXT,frame TEXT,badge TEXT);
CREATE TRIGGER IF NOT EXISTS reward_claim_credit AFTER INSERT ON reward_claims BEGIN
 INSERT INTO reward_wallets(user,sugar,scraps) VALUES(NEW.user,NEW.sugar,NEW.scraps) ON CONFLICT(user) DO UPDATE SET sugar=sugar+NEW.sugar,scraps=scraps+NEW.scraps;
END;
CREATE TRIGGER IF NOT EXISTS reward_purchase_check BEFORE INSERT ON reward_items WHEN NOT EXISTS(SELECT 1 FROM reward_items WHERE user=NEW.user AND (item=NEW.item OR request_key=NEW.request_key)) BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM reward_wallets WHERE user=NEW.user AND sugar>=NEW.sugar_cost AND scraps>=NEW.scrap_cost) THEN RAISE(ABORT,'insufficient_rewards') END;
END;
CREATE TRIGGER IF NOT EXISTS reward_purchase_debit AFTER INSERT ON reward_items BEGIN
 UPDATE reward_wallets SET sugar=sugar-NEW.sugar_cost,scraps=scraps-NEW.scrap_cost WHERE user=NEW.user;
END;
