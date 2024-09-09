
const vscode = require('vscode');

export function activate(context: vscode.ExtensionContext) {
  // this is the main operation to call to retrieve the ZoweExplorerApi.IApiRegisterClient object
  // use the optional parameter to constrain the version or newer of Zowe Explorer your extension is supporting
  const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.16.1");
  if (zoweExplorerApi) {
    // access the API such as registering new API implementations
    // <your code here>
    return true;
  }
  void vscode.window.showInformationMessage("Zowe Explorer was not found: Notify the user with a message.");
  return false;
} export function activate(context: vscode.ExtensionContext) {
    // this is the main operation to call to retrieve the ZoweExplorerApi.IApiRegisterClient object
    // use the optional parameter to constrain the version or newer of Zowe Explorer your extension is supporting
    const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.16.1");
    if (zoweExplorerApi) {
        // access the API such as registering new API implementations
        // <your code here>
        return true;
    }
    void vscode.window.showInformationMessage("Zowe Explorer was not found: Notify the user with a message.");
    return false;
}