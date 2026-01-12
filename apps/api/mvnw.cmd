@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM ----------------------------------------------------------------------------
@ECHO OFF

set MAVEN_SKIP_RC=%MAVEN_SKIP_RC%
if not "%MAVEN_SKIP_RC%" == "" goto skipRcPre
if exist "%USERPROFILE%\mavenrc_pre.bat" call "%USERPROFILE%\mavenrc_pre.bat"
if exist "%USERPROFILE%\mavenrc_pre.cmd" call "%USERPROFILE%\mavenrc_pre.cmd"
:skipRcPre

set JAVA_HOME=%JAVA_HOME%
if "%JAVA_HOME%" == "" (
  echo Warning: JAVA_HOME is not set.
)

set BASE_DIR=%~dp0
set WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

if "%MVNW_VERBOSE%" == "true" (
  echo Java Home: %JAVA_HOME%
  echo JAR: %WRAPPER_JAR%
)

"%JAVA_HOME%\bin\java.exe" -classpath "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %*

