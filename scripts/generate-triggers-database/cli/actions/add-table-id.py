import sqlite3, getopt

class AddTableId:

    def boot(self, app_root, args):
        self.app_root = app_root
        self.conn = sqlite3.connect(app_root + "/database/cpl-app.db")
        return True

    def process(self):
        self.create_ids()
        self.conn.commit()
        self.conn.close()

    def create_ids(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT name\
                        FROM sqlite_master\
                        WHERE\
                            type='table'\
                            AND name NOT LIKE 'sqlite_%'\
                            AND name NOT LIKE '\_%' ESCAPE '\\'")# AND name = 'anyliturgic'")

        print_scripts = False

        for row in cursor.fetchall():
            table_name = row[0]
            print(f"Adding id in table {table_name}")

            #Drop tmp table first
            drop_tmp_first_statement = "DROP TABLE IF EXISTS _tmp"
            if print_scripts:
                print(drop_tmp_first_statement)
            cursor.execute(drop_tmp_first_statement)

            #Create tmp table
            rename_statement = f"ALTER TABLE {table_name} RENAME TO _tmp"
            if print_scripts:
                print(rename_statement)
            cursor.execute(rename_statement)

            #Create the table again with the id NN PK AI
            create_column_type = ""
            pragma_statement = "PRAGMA table_info(_tmp)"
            cursor.execute(pragma_statement)
            columns_for_insert = ""
            has_text_id_column = False
            for row in cursor:
                column = row[1]
                type = row[2]
                if column == 'id' or column == 'Id':
                    has_text_id_column = True
                else:
                    if len(columns_for_insert) == 0:
                        columns_for_insert = column
                        create_column_type = f"`{column}` {type} NOT NULL"
                    else:
                        columns_for_insert = f"{columns_for_insert}, {column}"
                        create_column_type = f"{create_column_type}, `{column}` {type} NOT NULL"
            create_statement = f"CREATE TABLE {table_name} (`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,{create_column_type})"
            if print_scripts:
                print(create_statement)
            cursor.execute(create_statement)

            #Insert from tmp to the new table
            order_by_part = "";
            if has_text_id_column:
                order_by_part = "ORDER BY CAST(id AS INTEGER) ASC"
            insert_statement = f"INSERT INTO {table_name} ({columns_for_insert}) SELECT {columns_for_insert} FROM _tmp {order_by_part}"
            if print_scripts:
                print(insert_statement)
            cursor.execute(insert_statement)

            #Drop tmp table
            drop_tmp_statement = "DROP TABLE _tmp"
            if print_scripts:
                print(drop_tmp_statement)
            cursor.execute(drop_tmp_statement)
