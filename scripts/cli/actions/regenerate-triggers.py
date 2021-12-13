#Execution: ./app/cpl-cli.py regenerate-triggers

import sqlite3, getopt

class RegenerateTriggers:

    def boot(self, app_root, args):
        self.delete_triggers = True
        self.app_root = app_root
        self.conn = sqlite3.connect(app_root + "/database/cpl-app.db")

        self.parse_options(getopt.getopt(args, "d")[0])
        return True

    def parse_options(self, opts):
        for option, argument in opts:
            if option == "-d":
                self.delete_triggers = True

    def process(self):
        #Generate logging table
        self.create_log_table()
        self.create_triggers()
        self.conn.commit()
        self.conn.close()

    def create_triggers(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_%' ESCAPE '\\'")
        for row in cursor.fetchall():
            table_name = row[0]
            #Insert trigger
            print(f"Regenerating insert trigger for {table_name}")
            if self.delete_triggers:
                cursor.execute(f"DROP TRIGGER IF EXISTS log_insert_{table_name}")
            cursor.execute(f"CREATE TRIGGER IF NOT EXISTS log_insert_{table_name}\
                AFTER INSERT ON {table_name} FOR EACH ROW\
                BEGIN\
                    INSERT INTO _tables_log (table_name, row_id, action, date)\
                    VALUES ('{table_name}', new.id, 1, datetime('now'));\
                END;")

            #Update trigger
            print(f"Regenerating update trigger for {table_name}")
            if self.delete_triggers:
                cursor.execute(f"DROP TRIGGER IF EXISTS log_update_{table_name}")
            cursor.execute(f"CREATE TRIGGER IF NOT EXISTS log_update_{table_name}\
                AFTER UPDATE ON {table_name} FOR EACH ROW\
                BEGIN\
                    INSERT INTO _tables_log (table_name, row_id, action, date)\
                    VALUES ('{table_name}', old.id, 2, datetime('now'));\
                END;")

            #Delete trigger
            print(f"Regenerating delete trigger for {table_name}")
            if self.delete_triggers:
                cursor.execute(f"DROP TRIGGER IF EXISTS log_delete_{table_name}")
            cursor.execute(f"CREATE TRIGGER IF NOT EXISTS log_delete_{table_name}\
                AFTER DELETE ON {table_name} FOR EACH ROW\
                BEGIN\
                    INSERT INTO _tables_log (table_name, row_id, action, date)\
                    VALUES ('{table_name}', old.id, 3, datetime('now'));\
                END;")

    def create_log_table(self):
        cursor = self.conn.cursor()
        res = cursor.execute("CREATE TABLE IF NOT EXISTS _tables_log(\
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,\
            table_name TEXT NOT NULL,\
            row_id INTEGER NOT NULL,\
            action INTEGER NOT NULL,\
            date TEXT NOT NULL\
            )")
