// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const zowe_explorer_api = require('@zowe/zowe-explorer-api');
const ProfileInfo = require("@zowe/imperative");
const SubmitJobs = require("@zowe/zos-jobs-for-zowe-sdk");
const Download = require("@zowe/zos-files-for-zowe-sdk");
const { profile } = require('console');



/**
 * @param {vscode.ExtensionContext} context
 */
let StatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);


function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zSearch" is now active!');


	let teste = vscode.commands.registerCommand('zSearch.Testa', function () {

		abreElemento("EXCIDAVE", 200, "X93182.LIB.SOURCE");



	})

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zSearch.Search', function (node = zowe_explorer_api.ZoweTreeNode) {
		// The code you place here will be executed every time your command is executed
		// const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.18.0");
		// Display a message box to the user

		const Biblioteca = node.label;
		const BibliotecaChildren = node.children;

		console.log(BibliotecaChildren);

		if (Biblioteca) {
			const editor = vscode.window.activeTextEditor;
			let seleccao;

			if (editor != null) {

				const selectedText = editor.document.getText(editor.selection);

				if (selectedText != '') {

					seleccao = selectedText.toUpperCase();

					trataFiltros(seleccao, Biblioteca, BibliotecaChildren);

				} else {

					introduzirString(Biblioteca, BibliotecaChildren);

				}

			} else {

				introduzirString(Biblioteca, BibliotecaChildren);
			}


		} else {
			vscode.window.showErrorMessage("No Search library selected");

		}

	});


	StatusBar.command = "zSearch";
	StatusBar.tooltip = "Searching the mainframe";
	context.subscriptions.push(StatusBar);
	context.subscriptions.push(disposable);
	context.subscriptions.push(teste);
}

function introduzirString(Biblioteca = '', BibliotecaChildren) {

	if (BibliotecaChildren.length > 0) {

		vscode.window.showInputBox({
			placeHolder: "Search string",
			value: "",
			title: "zSearch - Insert the search string ",
			"ignoreFocusOut": true
		}).then((value) => {

			trataFiltros(value, Biblioteca, BibliotecaChildren);
		});

	}
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
//////////////////////////////////////////////////////////////////
function escreveJob(session, Biblioteca = new String, ValorPesquisar = new String, filtros = []) {

	// "//X93182SR JOB ,'Search',MSGCLASS=X,CLASS=D,REGION=6M",

		let ValorMostra;

	const userid = session.ISession.user;

		const user = vscode.workspace.getConfiguration().get('zSearch.JobName');;
		const userfinal = user.split('${USER}').join(userid);
		const CLASS = vscode.workspace.getConfiguration().get('zSearch.JobCardCLASS');
		const MSGCLASS = vscode.workspace.getConfiguration().get('zSearch.JobCardMSGCLASS');
		if (ValorPesquisar.length > 15) {

			ValorMostra = ValorPesquisar.substring(0, 12) + '...';
		} else {
			ValorMostra = ValorPesquisar;
		}
	const JobCard = '//' + userfinal + " JOB ,'Search for " + ValorMostra + "',MSGCLASS=" + MSGCLASS + ",CLASS=" + CLASS + ",REGION=6M";
		let filtroPesquisa = ObtemFiltroPesquisar(filtros);

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



	return job.toUpperCase();
	// })

}

function trataFiltros(ValorPesquisar, Biblioteca, BibliotecaChildren) {

	vscode.window.showInputBox({
		placeHolder: "Search filter",
		title: "zSearch - Filter search elements",
		prompt: "Filter search elementos. Example: AA*, BB*",
		"ignoreFocusOut": true
	}).then(value => {

		StatusBar.text = 'Searching for ' + ValorPesquisar;
		StatusBar.show();

		const valueUpperCase = value.toUpperCase();
		const valueTrim = valueUpperCase.split(' ').join('');

		const filtro = valueTrim.split(',');
		let filtroSelecionado = [];
		BibliotecaChildren.forEach(registo => {

			filtro.forEach(filtro => {
				if (filtro.endsWith('*')) {
					if (registo.label.startsWith(filtro.substring(0,filtro.length-1))) {
						filtroSelecionado.push(registo.label);
					}
				} else {
					if (filtro.startsWith('*')) {
						if (registo.label.endsWith(filtro.substring(1))) {
							filtroSelecionado.push(registo.label);
						}
					}
				}
			})
		});

		trataSessao(ValorPesquisar, Biblioteca, filtroSelecionado)
	});

}

//////////////////////////////////////////////////////////////////
function trataSessao(ValorPesquisar, Biblioteca, value) {

	(async () => {
		const profInfo = new ProfileInfo.ProfileInfo("zowe");
		await profInfo.readProfilesFromDisk();
		const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");
		const zosmfMergedArgs = profInfo.mergeArgsForProfile(zosmfProfAttrs, { getSecureVals: true });
		const session = ProfileInfo.ProfileInfo.createSession(zosmfMergedArgs.knownArgs);

		const job = new Job(session, ValorPesquisar, Biblioteca, value);

		executaJobZowe(job);

	})().catch((err) => {
		console.error('ObtemRespostaJobZowe - erro: ' + err);
		process.exit(1);
	});

}


//////////////////////////////////////////////////////////////////
function ObtemFiltroPesquisar(filtro = []) {

	const ElementosPorLinha = 6;
	let filtroPesquisa = new String;

	if (filtro.length > 0) {

		for (let i = 0; i < filtro.length; i++) {

			if (i / ElementosPorLinha == Math.floor(i / ElementosPorLinha)) {
				if (i > 0) {
					filtroPesquisa += '\n'
				}
				filtroPesquisa += "SELECT " + filtro[i];
			} else {
				filtroPesquisa += "," + filtro[i];

			}


		}
		filtroPesquisa += '\n';
	}

	return filtroPesquisa;

}

//////////////////////////////////////////////////////////////////

function executaJobZowe(job = new Job) {

	(async () => {
		SubmitJobs
			.SubmitJobs
			.submitJclNotify(job.Session, job.JCL)
			.then(resultado => {

				 ObtemRespostaJobZowe(resultado, job);

			});

	})().catch((err) => {
		console.error('executaJobZowe - erro: ' + err);
		process.exit(1);
	});
}

//////////////////////////////////////////////////////////////////

function ObtemRespostaJobZowe(jobExecutado, job = new Job) {

	(async () => {

		console.log(job);

		SubmitJobs
			.GetJobs
			.getSpoolContentById(job.Session, jobExecutado.jobname, jobExecutado.jobid, 102).then(resposta => {
				console.log("resposta getSpoolContent: " + resposta);

				const Resultados = new ResultadoPesquisa(job.ValorPesquisar, resposta);
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
	constructor(session, ValorPesquisar, Biblioteca, Filtro) {

		this.ValorPesquisar = ValorPesquisar.toUpperCase();
		this.Biblioteca = Biblioteca;
		this.Filtros = Filtro;
		this.Session = session;
		this.JCL = escreveJob(this.Session, this.Biblioteca, this.ValorPesquisar, this.Filtros);

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

	const outDD = resultado.outDD.split(resultado.Pesquisa).join("<span>" + resultado.Pesquisa + "</span>");
	const json = resultado.json.split(resultado.Pesquisa).join("<span>" + resultado.Pesquisa + "</span>");

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
        h3 {
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
		    color: var(--vscode-button-secondaryForeground);
            box-shadow: none;
			}

		.desbloqueado:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
		    color: var(--vscode-button-secondaryForeground);
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
		}

		.desbloqueado:active {
            background-color: var(--vscode-button-secondaryHoverBackground);
		    color: var(--vscode-button-secondaryForeground);
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
		    color: var(--vscode-button-secondaryForeground);
            color: var(--vscode-button-color);
		}

		.disponivel:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
		    color: var(--vscode-button-secondaryForeground);
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

		span {
		    background-color: var(--vscode-button-secondaryHoverBackground);
		    color: var(--vscode-button-secondaryForeground);
		}
    </style>
</head>

<body>
    <div class="cabecalho">
        <h1>Mainframe Search Results</h1>
        <h3 id="cabecalho">Search results for: ` + resultado.Pesquisa + `</h3>
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
        <div id="OutDD" class="vista"><div class="outDD">` + outDD + `</div></div>
	    <div id="Json" class="vista"><div class="Json">` + json + `</div></div>`;
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
	    <td class="linha"><a onclick="abreElemento('`;
	const LinhaIni2 = `', '`;
	const LinhaIni3 = `')">`;
	const LinhaMid = `</a></td >
	    <td class="ocorrencia">`;
	const LinhaFim = `</td >
	</tr>`;

	let Elementos = '';

	if (resultado.temResultado) {

		for (let i = 0; i < resultado.Resultados.length; i++) {

			let Lista = '';

			for (let j = 0; j < resultado.Resultados[i].List.length; j++) {

				const textoPreSpan = resultado.Resultados[i]
					.List[j]
					.text;

				const textoSpan = textoPreSpan.split(resultado.Pesquisa)
					.join("<span>" + resultado.Pesquisa + "</span>");

				Lista += LinhaIni
					+ resultado.Resultados[i].Name
					+ LinhaIni2
					+ resultado.Resultados[i].List[j].line
					+ LinhaIni3
					+ resultado.Resultados[i].List[j].line
					+ LinhaMid
					+ textoSpan
					+ LinhaFim
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
	StatusBar.hide();
}

function abreElemento(elemento = '', linha = 0, biblioteca = '') {

	// Exemplo:
	// const ComandoZowe = 'zowe zos-files view data-set "CMNP.MG1D.STG.CORE.#' +
	// 	Elemento.obterNumeroPacote() +
	// 	'.' +
	// 	Elemento.obterPastaPacote() +
	// 	'(' +
	// 	Elemento.obterNome() +
	// 	')"
	// --response - format - json';


	console.log('Elemento a abrir: ' + elemento + 'na linha ' + linha);

	(async () => {
		// Load connection info from default z/OSMF profile

		const profInfo = new ProfileInfo.ProfileInfo("zowe");
		await profInfo.readProfilesFromDisk();
		const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");
		const zosmfMergedArgs = profInfo.mergeArgsForProfile(zosmfProfAttrs, { getSecureVals: true });
		const session = ProfileInfo.ProfileInfo.createSession(zosmfMergedArgs.knownArgs);

		const options = {
			"file": "C:/Users/d.fonseca.do.canto/Documents/Projectos/Testes/teste.cbl"
			// "encoding": "UTF-8",
			// "file": "temp",
			// "extension": "txt",
			// "preserveOriginalLetterCase":true,
            // "record":true
		};
		// IDownloadOptions({ failFast: false });
		const dataset = biblioteca + "(" + elemento + ")";
		// const dataset = biblioteca;
		console.log(dataset);
		// const response = await Download.Download.allMembers(session, biblioteca, options);
		// const response = await Download.Download.allDataSets(session, dataset, options).finally;
		// const response = await Download.Get.dataSet(session, dataset, options);
		// const response = (await Download.Get.dataSet(session, dataset));
		const response = await Download.Download.dataSet(session, dataset, options);


		console.log(response);
	})().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}