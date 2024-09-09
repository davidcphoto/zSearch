// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const zowe = require('zowe-explorer-api');

inport * from '@zows/zowe-explorer-api';

export let inportedAPI;
export let getJesApiImplementation;
//const { visitNode } = require('typescript');
// const zowe = require('@zowe/zowe-explorer-api');

// Import the node type from Zowe Explorer API
// const zowe = require('@zowe/zowe-explorer-api');
/**
 * @param {vscode.ExtensionContext} context
 */
let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);


function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mainframesearch" is now active!');



	let disposable2 = vscode.commands.registerCommand('mainframesearch.teste', function () {


		const valor = vscode.extensions.getExtension("zowe.zowe-explorer").exports;

		console.log(valor);
	})



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mainframesearch.Search', function (node: iZoweDatasetTreeNode) {
		// The code you place here will be executed every time your command is executed
		// const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.18.0");
		// Display a message box to the user

		const tree = vscode.TreeItem;
		console.log(tree)

		const editor = vscode.window.activeTextEditor;
		let seleccao = '';

		if (editor != null) {

			const selectedText = editor.document.getText(editor.selection);

			if (selectedText != '') {

				seleccao = selectedText.toUpperCase();


			}
		}

		const Biblioteca = vscode.workspace.getConfiguration().get('util.LastSearch');
		const items = [
			{ label: 'Pesquisar', description: 'Procurar o valor na biblioteca' },
			{ label: 'Valor', description: seleccao },
			{ label: 'Biblioteca', description: Biblioteca }
		];

		Obter(items);


	});


	myStatusBarItem.command = "Mainframe Seach";
	myStatusBarItem.text = 'Searching...';
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

//////////////////////////////////////////////////////////////////
function escreveJob(Biblioteca = new String, ValorPesquisar = new String, filtro = []) {

	const JobCard = vscode.workspace.getConfiguration().get('mainframesearch.JobCard');

	let filtroPesquisa = ObtemFiltroPesquisar(filtro);

	const job = JobCard + `
//SEARCH  EXEC PGM=ISRSUPC,
//            PARM=(SRCHCMP,
//            'ANYC')
//NEWDD  DD DISP=SHR,
//          DSN=` + Biblioteca + `
//OUTDD  DD SYSOUT=(O)
//SYSIN  DD *
SRCHFOR  '` + ValorPesquisar + `'
` + filtroPesquisa +
		`/*`;



	return job;

}

//////////////////////////////////////////////////////////////////
function escreveFicheiro(job = new Job) {

	fs.writeFile(job.Path, job.JCL, (err) => {

		// In case of a error throw err.
		if (err) {
			console.error(err);
			throw err
		};
	})
}
//////////////////////////////////////////////////////////////////
function ObterBiblioteca() {

// Declare the node type when defining the node as a parameter for the function



	// console.log('node ' + node);
	// const Biblioteca = vscode.window.showInformationMessage(EventEmitter);

	return "X93182.LIB.SOURCE"

}

//////////////////////////////////////////////////////////////////
function ObterValorPesquisar() {


}

//////////////////////////////////////////////////////////////////
function ObtemFiltroPesquisar(filtro = []) {

	const ElementosPorLinha = 6;
	let filtroPesquisa = new String;

	if (filtro.length > 0) {

		for (let i = 0; i < filtro.length; i++) {

			if (i % ElementosPorLinha) {
				filtroPesquisa += "SELECT " + filtro[i];
			} else {
				filtroPesquisa += "," + filtro[i];

			}


		}
	}

	return filtroPesquisa;

}


//////////////////////////////////////////////////////////////////

function executarJob(ValorPesquisar, Job) {

	const { exec } = require("child_process");
	const Comando = 'zowe zos-jobs submit local-file "' + Job.Path + '" --view-all-spool-content --reject-unauthorized false --wfo --response-format-json';

	exec(Comando, (error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}


		const dados = stdout.replace(/(\r\n|\n|\r)/gm, "");

		const myObj = JSON.parse(dados);

		if (myObj.success) {

			for (let i = 0; i < myObj.data.length; i++) {
				if (myObj.data[i].ddName == 'OUTDD') {

					const Dados = myObj.data[i].data;
					console.log(`Dados: ${Dados}`);
					const Resultados = new ResultadoPesquisa(ValorPesquisar, Dados);
					console.log(Resultados);

					geraWebView(Resultados);
				}

			}

		} else {

			vscode.window.showErrorMessage("Search Job tor executed");
		}
	}
	)
}

//////////////////////////////////////////////////////////////////

class Job {
	constructor(ValorPesquisar, Biblioteca) {

		this.JCL = escreveJob(Biblioteca, ValorPesquisar);
		this.Path = vscode.workspace.workspaceFolders[0].uri.fsPath + "\\" + ValorPesquisar + ".jcl";

	}
}

class LinhaEncontrada {
	constructor(Linha) {

		this.line = Number(Linha.substr(0, 8));
		this.text = Linha.substr(8);

	}
}

class ItemEncontrado {
	constructor(ItemName, Item = []) {

		let Lista = [];

		for (let i = 0; i < Item.length; i++) {

			if (Item[i].trim()) {
				const Linha = new LinhaEncontrada(Item[i]);
				Lista.push(Linha);
			}

		}

		this.Name = ItemName;
		this.List = Lista;


	}
}


class ResultadoPesquisa {

	constructor(ValorPesquisar = '', OUTDD = new String) {

		const OUTDDSplit = OUTDD.split('\n');
		let item;
		let Lista = [];
		let ItemTratado = [];

		for (let i = 0; i < OUTDDSplit.length; i++) {


			if (OUTDDSplit[i].includes('--------- STRING(S) FOUND -------------------')) {

				if (item) {
					ItemTratado.push(new ItemEncontrado(item, Lista));
				}
				item = OUTDDSplit[i].substring(2, 10);
			} else {

				if (item) {
					if (OUTDDSplit[i].includes(ValorPesquisar)) {
						Lista.push(OUTDDSplit[i]);
					}
				}
			}


		}

		this.Pesquisa = ValorPesquisar;
		this.outDD = OUTDD;

		if (item) {
			ItemTratado.push(new ItemEncontrado(item, Lista));
			this.Resultados = ItemTratado;
			const code_json = '{"result":' + JSON.stringify(ItemTratado) + '}';
			this.json = JSON.stringify(JSON.parse(code_json), null, 5);
			this.temResultado = true;
		} else {

			this.Resultados = [];
			this.json = '{}';
			this.temResultado = false;
		}

	}
}
//////////////////////////////////////////////////////////////////


function Obter(items = []) {

	vscode.window.showQuickPick(items, {
		matchOnDescription: true,
		placeHolder: 'Search:',
	}).then((selected) => {

		switch (selected.label) {
			case "Valor":
			case "Biblioteca":

				const Valor = vscode.window.showInputBox({
					placeHolder: selected.label,
					value: selected.description,
					title: selected.label
				}).then((value) => {

					let i = items.indexOf(selected)
					items[i].description = value.toUpperCase();
					Obter(items);

				});
				console.log('Valor:', Valor);



				break;
			case "Pesquisar":

				let valor = items[1].description;
				let biblioteca = items[2].description;

				vscode.workspace.getConfiguration().update('util.LastSearch', biblioteca)

				if (valor === '' && biblioteca === '') {
					vscode.window.showInformationMessage("Valor a pesquisar ou Biblioteca não preenchidos.");
				}
				else {


					myStatusBarItem.text = 'Job de 3.14 a executar...';
					myStatusBarItem.show();
					const job = new Job(valor, biblioteca);
					console.log(job.JCL);

					vscode.window.showInformationMessage('Sarching Mainframe for ' + valor);

					myStatusBarItem.text = 'Sarching Mainframe for ' + valor;
					myStatusBarItem.show();
					escreveFicheiro(job);

					executarJob(valor, job);

					myStatusBarItem.hide();
					}


		}
	})
		}
//////////////////////////////////////////////////////////////////
function geraWebView(resultado = new ResultadoPesquisa) {


	let painel;
	painel = vscode.window.createWebviewPanel('Search Result', 'Search Result', vscode.ViewColumn.Two)
	painel.webview.options = {
		enableScripts: true,
	};

	const HTMLInicio = `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pic Calculator</title>
    <style>

	    a {
		   cursor: pointer;
		}

        tr th {

            border: 1px solid var(--vscode-list-hoverBackground);
            padding: 8px;

        }

        .linha {
            text-align: center;
            width: 20vw;

        }

        .elemento {
		   cursor: pointer;
            p {
                display: block;
                border: 1px solid var(--vscode-list-hoverBackground);
                padding: 8px;
            }
        }

        .elemento:hover {
            p {
                background-color: var(--vscode-list-hoverBackground);
            }
        }

		.elemento p:before {
		    content: '';
            width: 0px;
            height: 0px;
            border-style: solid;
            border-width: 5px 5px 0px 5px;
            border-color: #fff transparent transparent transparent;
            display: inline-block;
            vertical-align: middle;
            bottom: -13px;
            left: 0;
            right: 0;
            margin: 0 auto;
            margin: 8px;
            transform: rotate(-90deg);
		}


        h1,
        h2 {
            text-align: center;
        }

        table{
            transition: all .5s ease;

            display: none;
            position: relative;
            min-width: 160px;
            z-index: 1;
        }
        .vista{
            display: none;
            z-index: 1;
        }

		.select {
            width: 90vw;
		}


        .select:hover .select:active {

            box-shadow: none;
            background-color: var(--vscode-list-hoverBackground);
        }

        .ocorrencia {
            text-align: left;
            padding: 8px;
            width: 90vw;

        }

        .cabecalho {
            display: block;
            position: sticky;
            background-color: var(--vscode-list-hoverBackground);
            z-index: 5;
            padding: 8px;
            top: 0;
        }

        .botoes {
		    z-index: 10;
            text-align: right;
        }

		a {
		    display: nothing;
		    padding: 0;
        }
		.desbloqueado {
            background-color: var(--vscode-button-secondaryBackground);
            box-shadow: none;
			}

		.desbloqueado:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
		}

		.desbloqueado:active {
            background-color: var(--vscode-button-secondaryHoverBackground);
            box-shadow: none;
		}
l
 		.Lista{
		    display: none;
		    position: relative;
        }

 		.Json {
		    display: block;
		    white-space: pre;
		    position: relative;
			overflow:auto;
        }

		.outDD {
		    display: block;
		    white-space: pre;
		    position: relative;
			overflow:auto;
        }

		button, button:active {
            background-color: var(--vscode-selectBackground);
            color: var(--vscode-button-color);
			border: 0px;
			margin: 2px;
		    padding: 8px;
		}

		.disponivel {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-color);
		}

		.disponivel:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
            box-shadow: 0px 8px 16px 0px rgba(3, 0, 0, 0.3);
		}

		.visivel, .visivel .visivel table {
		    display: block;
		}
		.visivel .visivel p:before {
		    content: '';
            width: 0px;
            height: 0px;
            border-style: solid;
            border-width: 5px 5px 0px 5px;
            border-color: #fff transparent transparent transparent;
            display: inline-block;
            vertical-align: middle;
            bottom: -13px;
            left: 0;
            right: 0;
            margin: 0 auto;
            margin: 8px;
            transform: none;
		}

    </style>
</head>

<body>
    <div class="cabecalho">
        <h1>Mainframe Search Results</h1>
        <h2 id="cabecalho">Search results for: ` + resultado.Pesquisa + `</h2>
	    <div class="botoes">
           <button id="btLista" type="check" name="vista" onclick="Escolher(this.id)">List</vscode>
           <button id="btOutDD" class="disponivel" type="check" name="vista" onclick="Escolher(this.id)">OutDD</vscode>
           <button id="btJson" class="disponivel"type="check" name="vista" onclick="Escolher(this.id)">Json</button>
       </div>
    </div>
	<div id="resultados">`;
	const ListaResultados = `
		<div id="Lista" class="vista visivel">
		`

	const HTMLFim = `    </div>
        <div id="OutDD" class="vista"><code class="outDD">` + resultado.outDD + `</code></div>
	    <div id="Json" class="vista"><code class="Json">` + resultado.json + `</code></div>`;
	const HTMLFim2 = `
	</div>
    <script>

        function Escolher(escolha) {
            console.log(escolha);

			switch(escolha) {
			    case "btLista":
			    	document.getElementById("btLista").classList.remove("disponivel");
					document.getElementById("btOutDD").classList.add("disponivel");
					document.getElementById("btJson").classList.add("disponivel");
					document.getElementById("Lista").classList.add("visivel");
					document.getElementById("OutDD").classList.remove("visivel");
					document.getElementById("Json").classList.remove("visivel");
					break;
			    case "btOutDD":
			    	document.getElementById("btLista").classList.add("disponivel");
					document.getElementById("btOutDD").classList.remove("disponivel");
					document.getElementById("btJson").classList.add("disponivel");
					document.getElementById("Lista").classList.remove("visivel");
					document.getElementById("OutDD").classList.add("visivel");
					document.getElementById("Json").classList.remove("visivel");
					break;
			    case "btJson":
			    	document.getElementById("btLista").classList.add("disponivel");
					document.getElementById("btOutDD").classList.add("disponivel");
					document.getElementById("btJson").classList.remove("disponivel");
					document.getElementById("Lista").classList.remove("visivel");
					document.getElementById("OutDD").classList.remove("visivel");
					document.getElementById("Json").classList.add("visivel");
					break;
			}
        }

		function mostraelemento(id) {

		    console.log(id);
			if (document.getElementById(id).classList.contains("visivel")) {
    			document.getElementById(id).classList.remove("visivel");
			} else {
				document.getElementById(id).classList.add("visivel");
			}

		}
	</script>
	</body >`;

	const ElementoIni = `        <div id="`;
	const ElementoIni2 = `" class="elemento"><p onclick="mostraelemento(this.parentNode.id)">`;
	const ElementoMid = `</p>
            <table id="table">
                <tr>
                    <th class="linha">Line</th>
                    <th class="ocorrencia">Occurrence</th>
                </tr>`;
	const ElementoFim = `</table>
        </div>`;

	const LinhaIni = `
	<tr class="select">
	    <td class="linha"><a>`;
	const LinhaMid = `</a></td >
	    <td class="ocorrencia">`;
	const LinhaFim = `</td >
	</tr>`;

	let Elementos = '';

	if (resultado.temResultado) {

		for (let i = 0; i < resultado.Resultados.length; i++) {

			let Lista = '';

			for (let j = 0; j < resultado.Resultados[i].List.length; j++) {

				const Linha = LinhaIni + resultado.Resultados[i].List[j].line + LinhaMid + resultado.Resultados[i].List[j].text + LinhaFim
				Lista += Linha;
			}
			const element = ElementoIni + resultado.Resultados[i].Name + ElementoIni2 + resultado.Resultados[i].Name + ElementoMid + Lista + ElementoFim
			Elementos += element;
		}

		Elementos = ListaResultados + Elementos + HTMLFim;


	} else {

		Elementos = '<h2>No results returned.</h2>';

	}

	const HTML = HTMLInicio + Elementos + HTMLFim2;
	console.log(HTML);
	painel.webview.html = HTML;
}