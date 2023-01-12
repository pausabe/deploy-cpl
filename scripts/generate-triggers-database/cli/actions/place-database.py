import shutil
from pathlib import Path

class PlaceDatabase:

    def boot(self, app_root, args):
        if len(args) < 1:
            print("File argument is missing")
            return False
        self.dbfile = args[0]
        self.app_root = app_root
        return True

    def process(self):
        #Create path and copy file
        Path(self.app_root + "/database").mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self.dbfile, self.app_root + "/database/cpl-app.db")
        pass
