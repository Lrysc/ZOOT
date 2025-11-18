; 多语言支持
!include MUI2.nsh
!include LogicLib.nsh

; 界面配置
!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"

; 安装页面顺序
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载页面顺序
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言设置
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

; 设置安装目录权限
Function .onInit
  ; 设置默认安装路径
  StrCpy $INSTDIR "$PROGRAMFILES64\prts"

  ; 检测系统架构
  ${If} ${RunningX64}
    SetRegView 64
  ${Else}
    SetRegView 32
    StrCpy $INSTDIR "$PROGRAMFILES\prts"
  ${EndIf}
FunctionEnd

; 创建开始菜单快捷方式
Function CreateStartMenuShortcut
  CreateDirectory "$SMPROGRAMS\prts"
  CreateShortCut "$SMPROGRAMS\prts\prts.lnk" "$INSTDIR\prts.exe"
  CreateShortCut "$SMPROGRAMS\prts\Uninstall prts.lnk" "$INSTDIR\Uninstall prts.exe"
FunctionEnd

; 安装完成后执行
Function .onInstSuccess
  ; 写入注册表信息
  WriteRegStr HKLM "SOFTWARE\prts" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\prts" "Version" "1.0.0"

  ; 创建开始菜单快捷方式
  Call CreateStartMenuShortcut
FunctionEnd
