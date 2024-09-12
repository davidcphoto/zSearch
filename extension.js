// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const zowe_explorer_api = require('@zowe/zowe-explorer-api');
const ProfileInfo = require("@zowe/imperative");
const SubmitJobs = require("@zowe/zos-jobs-for-zowe-sdk");



/**
 * @param {vscode.ExtensionContext} context
 */
let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);


function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zSearch" is now active!');



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zSearch.Search', function (node = zowe_explorer_api.ZoweTreeNode) {
		// The code you place here will be executed every time your command is executed
		// const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.18.0");
		// Display a message box to the user

		let Biblioteca;

		if (node) {
			Biblioteca = node.label;
			const editor = vscode.window.activeTextEditor;
			let seleccao;

			if (editor != null) {

				const selectedText = editor.document.getText(editor.selection);

				if (selectedText != '') {

					seleccao = selectedText.toUpperCase();

					formataZowe(seleccao, Biblioteca);

				} else {



					vscode.window.showInputBox({
						placeHolder: "Search string",
						value: "",
						title: "zSearch - Insert the search string "
					}).then((value) => {

						formataZowe(value, Biblioteca);

					});


				}

			}


		} else {
			vscode.window.showErrorMessage("No Search library selected");

		}

	});


	myStatusBarItem.command = "Mainframe Seach";
	myStatusBarItem.text = 'Searching...';
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
//////////////////////////////////////////////////////////////////
function escreveJob(Biblioteca = new String, ValorPesquisar = new String, filtro = []) {

	const JobCard = vscode.workspace.getConfiguration().get('zSearch.JobCard');

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
function formataZowe(ValorPesquisar, Biblioteca) {


	(async () => {

		// Load connection info from default z/OSMF profile
		const profInfo = new ProfileInfo.ProfileInfo("zowe");
		await profInfo.readProfilesFromDisk();
		const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");
		const zosmfMergedArgs = profInfo.mergeArgsForProfile(zosmfProfAttrs, { getSecureVals: true });
		const session = ProfileInfo.ProfileInfo.createSession(zosmfMergedArgs.knownArgs);

		 executaJobZowe(session, job);


	})().catch((err) => {
		console.error('ObtemRespostaJobZowe - erro: ' + err);
		process.exit(1);
	});
	const job = new Job(ValorPesquisar, Biblioteca);



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

function executaJobZowe(session, job = new Job) {

	(async () => {


		SubmitJobs
			.SubmitJobs
			.submitJclNotify(session, job.JCL)
			.then(resultado => {

				 ObtemRespostaJobZowe(session, resultado, job);

			});

	})().catch((err) => {
		console.error('executaJobZowe - erro: ' + err);
		process.exit(1);
	});
}

//////////////////////////////////////////////////////////////////

function ObtemRespostaJobZowe(session, job, dadosjob = new Job) {

	(async () => {

		console.log(job);

		SubmitJobs
			.GetJobs
			.getSpoolContentById(session, job.jobname, job.jobid, 102).then(resposta => {
				console.log("resposta getSpoolContent: " + resposta);

				const Resultados = new ResultadoPesquisa(dadosjob.ValorPesquisar, resposta);
				console.log(Resultados);

				geraWebView(Resultados);

			}).catch ((err) => {
				console.error('getSpoolContent - erro: ' + err);
			process.exit(1);
		});

	})().catch((err) => {
		console.error('ObtemRespostaJobZowe - erro: ' + err);
		process.exit(1);
	});
}

//////////////////////////////////////////////////////////////////

class Job {
	constructor(ValorPesquisar, Biblioteca) {

		this.ValorPesquisar = ValorPesquisar;
		this.Biblioteca = Biblioteca;
		this.JCL = escreveJob(this.Biblioteca, this.ValorPesquisar);

	}
}

//////////////////////////////////////////////////////////////////

class LinhaEncontrada {
	constructor(Linha) {

		this.line = Number(Linha.substr(0, 8));
		this.text = Linha.substr(8);

	}
}

//////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////

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