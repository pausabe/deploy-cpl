#!/usr/bin/env python3
import sys, importlib
from os import path

filename = sys.argv[0]
actions = ["regenerate-triggers", "place-database", "add-table-id"]

#Test if action is provided
if len(sys.argv) <= 1:
    print(f"No action provided:\nUSE: {filename} -a <action> [param[, param]...]\n",\
        f"Actions available are:\n{actions}")
    sys.exit()

action = sys.argv[1]

#Test if action exists
if not action in actions:
    print(f"Action {action} not found. Available actions are:\n{actions}")
    sys.exit()

#Avoid creation of __pycache__ folder inside actions directory and import action module
sys.dont_write_bytecode = True
action_mod = importlib.import_module("cli.actions." + action)

#Grab action class
class_name = action.replace("-", " ").title().replace(" ", "")
action_class = getattr(action_mod, class_name)

#Bootstrap action process
args = sys.argv[2:]
action_obj = action_class()
if action_obj.boot(path.dirname(path.realpath(__file__)), args):
    action_obj.process()
