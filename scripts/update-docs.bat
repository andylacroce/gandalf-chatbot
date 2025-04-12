@echo off
echo Running Gandalf Chatbot Documentation Update
cd /d %~dp0..
call npm run docs:weekly
echo Documentation check completed at %date% %time%