// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const zowe_explorer_api = require('@zowe/zowe-explorer-api');
const ProfileInfo = require("@zowe/imperative");
const SubmitJobs = require("@zowe/zos-jobs-for-zowe-sdk");
const Download = require("@zowe/zos-files-for-zowe-sdk");

var SessaoActiva;

/**
 * @param {vscode.ExtensionContext} context
 */
let StatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);


function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zSearch" is now active!');

	// let ExibirJob = vscode.commands.registerCommand('zSearch.ExibirJob', function (JobID) {

	// 	vscode.window.showInformationMessage(`Search executing job id([${JobID}](command:zowe.jobs.setJobSpool?%5B%22zosmf%22%2C%22${JobID}%22%5D))`);

	// })
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zSearch.Search', function (node = zowe_explorer_api.ZoweTreeNode) {
		// The code you place here will be executed every time your command is executed
		// const zoweExplorerApi = ZoweVsCodeExtension.getZoweExplorerApi("1.18.0");
		// Display a message box to the user

		const Biblioteca = node.label;
		const BibliotecaChildren = node.children;
		const sessao = node.mParent.session;
		SessaoActiva = node.mParent.session;

		console.log(sessao);

		if (Biblioteca) {
			const editor = vscode.window.activeTextEditor;
			let seleccao;

			if (editor != null) {

				const selectedText = editor.document.getText(editor.selection);

				if (selectedText != '') {

					seleccao = selectedText.toUpperCase();

					introduzirString(seleccao, Biblioteca, BibliotecaChildren, sessao);

				} else {

					introduzirString('', Biblioteca, BibliotecaChildren, sessao);

				}

			} else {

				introduzirString('', Biblioteca, BibliotecaChildren, sessao);
			}


		} else {
			vscode.window.showErrorMessage("No Search library selected");

		}

	});



	context.subscriptions.push(StatusBar);
	context.subscriptions.push(disposable);
}

function introduzirString(seleccao = '', Biblioteca = '', BibliotecaChildren, sessao) {

	if (BibliotecaChildren.length > 0) {

		getSearchString(seleccao).then(resultado => {
			getSearchFiters().then(filtros => {

				ValidaFiltro(resultado, Biblioteca, BibliotecaChildren, filtros, sessao);
			})

		})
	}
}

function ValidaFiltro(resultado = '', Biblioteca = '', BibliotecaChildren, filtros, sessao) {

	let filtroSelecionado = [];
	BibliotecaChildren.forEach(registo => {

		filtros.forEach(resultado => {
			const filtro = resultado.label.toUpperCase();
			switch (true) {
				case filtro.endsWith('*'):
					if (registo.label.startsWith(filtro.substring(0, filtro.length - 1))) {
						filtroSelecionado.push(registo.label);
					}
					break;
				case filtro.startsWith('*'):
					if (registo.label.endsWith(filtro.substring(1))) {
						filtroSelecionado.push(registo.label);
					}
					break;
				case !filtro.includes('*'):

					if (registo.label.startsWith(filtro.substring(0, filtro.length))) {
						filtroSelecionado.push(registo.label);
					}
					break;
			}
		})
	})
	trataSessao(resultado, Biblioteca, filtroSelecionado, sessao)
}

// This method is called when your extension is deactivated
function deactivate() { }
module.exports = {

	activate,
	deactivate
}
//////////////////////////////////////////////////////////////////
function escreveJob(session, Biblioteca = new String, ValorPesquisar = new String, filtros = []) {

	const userid = session.ISession.user;

	const user = vscode.workspace.getConfiguration().get('zSearch.JobCard.Name');
	const userfinal = user.split('${USER}').join(userid);
	const CLASS = vscode.workspace.getConfiguration().get('zSearch.JobCard.CLASS');
	const MSGCLASS = vscode.workspace.getConfiguration().get('zSearch.JobCard.MSGCLASS');

	const JobCard = '//' + userfinal + " JOB ,'zSearch',MSGCLASS=" + MSGCLASS + ",CLASS=" + CLASS + ",REGION=6M";
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

}

//////////////////////////////////////////////////////////////////
function trataSessao(ValorPesquisar, Biblioteca, value, sessao) {


	(async () => {

		const job = new Job(sessao, ValorPesquisar, Biblioteca, value);

		executaJobZowe(job);



	})().catch((err) => {
		console.error('trataSessao - erro: ' + err);
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

	StatusBar.text = `$(loading~spin) Searching...`;
	StatusBar.tooltip = `Searching for "${job.ValorPesquisar}" at "${job.Biblioteca}"!`;
	StatusBar.show();

	(async () => {

		SubmitJobs
			.SubmitJobs
			.submitJclNotify(job.Session, job.JCL)
			.then(resultado => {

				// vscode.window.showInformationMessage(`Search job [${resultado.jobname}](command:zowe.jobs.setJobSpool?%5B%22zosmf%22%2C%22${resultado.jobid}%22%5D)!`);

				ObtemRespostaJobZowe(resultado, job);

			});

	})().catch((err) => {
		console.error('executaJobZowe - erro: ' + err);
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

				const Resultados = new ResultadoPesquisa(job, resposta);
				console.log(Resultados);

				geraWebView(Resultados);

			}).catch((err) => {
				console.error('getSpoolContent - erro: ' + err);
			});

	})().catch((err) => {
		console.error('ObtemRespostaJobZowe - erro: ' + err);
	});

	StatusBar.hide();
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

	constructor(job = new Job, OUTDD = new String) {

		let OUTDDSplit = OUTDD.split('\n');
		const OUTDDSplitUpper = OUTDDSplit.map(function (x) { return x.toUpperCase(); })
		let item;
		let Lista = [];
		let ItemTratado = [];

		for (let i = 0; i < OUTDDSplit.length; i++) {


			if (OUTDDSplit[i].includes('--------- STRING(S) FOUND -------------------')) {

				if (item) {
					ItemTratado.push(new ItemEncontrado(item, Lista));
					Lista = [];
				}
				item = OUTDDSplit[i].substring(2, 10);
			} else {

				if (item) {
					if (OUTDDSplitUpper[i].includes(job.ValorPesquisar)) {
						if (OUTDDSplitUpper[i].indexOf("SRCHFOR  '" + job.ValorPesquisar + "'") <= 0) {
							Lista.push(OUTDDSplit[i]);
						}
					}
				}
			}


		}

		this.Pesquisa = job.ValorPesquisar;
		this.outDD = OUTDD;
		this.Biblioteca = job.Biblioteca;

		if (item) {
			ItemTratado.push(new ItemEncontrado(item, Lista));
			this.Resultados = ItemTratado;
			const code_json = JSON.stringify(ItemTratado);
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
	const posiçãoPainel = vscode.workspace.getConfiguration().get('zSearch.PanelPosition');

	painel = vscode.window.createWebviewPanel('Search Result', 'zSearch', posiçãoPainel, {
		enableScripts: true,
		enableFindWidget: true,
		retainContextWhenHidden: true
	});

	const json = Hilite(resultado.json, resultado.Pesquisa);
	const outDD = Hilite(resultado.outDD.toString(), resultado.Pesquisa);
	const total = resultado.Resultados.length;

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


        .table{
            transition: all .3s ease;
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
			position: relative;
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

		.botoesExpandir {
			position: absolute;
			z-index: 11;
		}

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
		    font-family:monospace;
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

		.visivel, .visivel .visivel .table {
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
	    <div>
		<h1>Mainframe Search Results</h1>
        <h3 id="cabecalho">Search results for: ${resultado.Pesquisa}</h3>
		</div>
		<div id="ListaExpandir" class="botoesExpandir">
        	<button id="btExpandir" class="disponivel" type="check" name="expand" onclick="expandir(this.id)" style="display: inline">Expand All (${total})</button>
        	<button id="btColapsar" class="disponivel" type="check" name="expand" onclick="expandir(this.id)" style="display: none">Collapse All (${total})</button>
       </div>
	    <div class="botoes">
           <button id="btLista" type="check" name="vista" onclick="Escolher(this.id)">List</button>
           <button id="btOutDD" class="disponivel" type="check" name="vista" onclick="Escolher(this.id)">OutDD</button>
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

	const vscode = acquireVsCodeApi();
        function Escolher(escolha) {
            console.log(escolha);

			switch(escolha) {
			    case "btLista":
			    	document.getElementById("ListaExpandir").style.visibility = "visible";
			    	document.getElementById("btLista").classList.remove("disponivel");
					document.getElementById("btOutDD").classList.add("disponivel");
					document.getElementById("btJson").classList.add("disponivel");
					document.getElementById("Lista").classList.add("visivel");
					document.getElementById("OutDD").classList.remove("visivel");
					document.getElementById("Json").classList.remove("visivel");
					break;
			    case "btOutDD":
			    	document.getElementById("ListaExpandir").style.visibility = "hidden";
			    	document.getElementById("btLista").classList.add("disponivel");
					document.getElementById("btOutDD").classList.remove("disponivel");
					document.getElementById("btJson").classList.add("disponivel");
					document.getElementById("Lista").classList.remove("visivel");
					document.getElementById("OutDD").classList.add("visivel");
					document.getElementById("Json").classList.remove("visivel");
					break;
			    case "btJson":
			    	document.getElementById("ListaExpandir").style.visibility = "hidden";
			    	document.getElementById("btLista").classList.add("disponivel");
					document.getElementById("btOutDD").classList.add("disponivel");
					document.getElementById("btJson").classList.remove("disponivel");
					document.getElementById("Lista").classList.remove("visivel");
					document.getElementById("OutDD").classList.remove("visivel");
					document.getElementById("Json").classList.add("visivel");
					break;
			}
        }

		function expandir(id) {

		    var lista = document.getElementsByClassName("elemento");
			if (id == "btExpandir") {

				for (let i = 0; i < lista.length; i++) {
					lista[i].classList.add("visivel");
				}

				document.getElementById("btExpandir").style.display = "none";
				document.getElementById("btColapsar").style.display = "inline";

			} else {

				for (let i = 0; i < lista.length; i++) {
					lista[i].classList.remove("visivel");
				}

				document.getElementById("btExpandir").style.display = "inline";
				document.getElementById("btColapsar").style.display = "none";

			 }

		}

		function mostraelemento(id) {

		    console.log(id);
			if (document.getElementById(id).classList.contains("visivel")) {

				document.getElementById(id).classList.remove("visivel");
				document.getElementById("btExpandir").style.display = "inline";

				if (document.getElementsByClassName("elemento visivel").length==0) {
					document.getElementById("btColapsar").style.display = "none";
				}

			} else {
				document.getElementById(id).classList.add("visivel");
				document.getElementById("btColapsar").style.display = "inline";

				if (document.getElementsByClassName("elemento visivel").length == document.getElementsByClassName("elemento").length) {
					document.getElementById("btExpandir").style.display = "none";
				}
			}

		}

function AbreFx(mensagem) {

    console.log(mensagem);

	vscode.postMessage(mensagem);
}
	</script>
	</body >`;

	const ElementoIni = `        <div id="`;
	const ElementoIni2 = `" class="elemento"><p onclick="mostraelemento(this.parentNode.id)">`;
	const ElementoMid = `</p>
            <table class="table">
                <tr>
                    <th class="linha">Line</th>
                    <th class="ocorrencia">Occurrence</th>
                </tr>`;
	const ElementoFim = `</table>
        </div>`;

	const LinhaIni = `
	<tr class="select">
	    <td class="linha"><a onclick=`;
	const LinhaIni3 = `>`;
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

				const textoSpan = Hilite(textoPreSpan, resultado.Pesquisa);

				const mensagem = `AbreFx('{"Elemento":"`
					+ resultado.Resultados[i].Name
					+ `","Linha":"`
					+ resultado.Resultados[i].List[j].line.toString()
					+ `","Biblioteca":"`
					+ resultado.Biblioteca
					+ `"}')`;

				Lista += LinhaIni
					+ mensagem
					+ LinhaIni3
					+ resultado.Resultados[i].List[j].line.toString()
					+ LinhaMid
					+ textoSpan
					+ LinhaFim
			}
			const element = ElementoIni
				+ resultado.Resultados[i].Name
				+ ElementoIni2
				+ resultado.Resultados[i].Name
				+ " ("
				+ resultado.Resultados[i].List.length + ")"
				+ ElementoMid
				+ Lista
				+ ElementoFim

			Elementos += element;
		}

		Elementos = ListaResultados + Elementos + HTMLFim;


	} else {

		Elementos = '<h2>No results returned.</h2>';

	}

	const HTML = HTMLInicio + Elementos + HTMLFim2;
	console.log(HTML);
	painel.webview.html = HTML;
	painel.webview.onDidReceiveMessage(message => {
		abreElemento(message);
	});
}

function abreElemento(mensagem) {

	const mensageJson = JSON.parse(mensagem);
	console.log('Elemento a abrir: ' + mensageJson.Elemento + ' na linha ' + mensageJson.Linha);

	(async () => {

		const profInfo = new ProfileInfo.ProfileInfo("zowe");
		await profInfo.readProfilesFromDisk();

		const dataset = mensageJson.Biblioteca + "(" + mensageJson.Elemento + ")";

		console.log(dataset);
		Download.Get.dataSet(SessaoActiva, dataset).then(resposta => {
			AbreElemento(resposta.toString(), mensageJson);

		})

	})().catch((err) => {
		console.error(err);
	});
}

function AbreElemento(doc, mensageJson) {

	if (vscode.workspace.workspaceFolders !== undefined) {

		var caminho = vscode.workspace.workspaceFolders[0].uri.fsPath + "\\"+ mensageJson.Elemento;

		var setting = vscode.Uri.parse("untitled:" + caminho);

		vscode.workspace.openTextDocument(setting).then((a) => {
			vscode.window.showTextDocument(a, 1, false).then(e => {
				e.edit(edit => {
					edit.insert(new vscode.Position(0, 0), doc);
				});
				const posição1 = new vscode.Position( Number(mensageJson.Linha) - 1, 0 );
				const posição2 = new vscode.Position( Number(mensageJson.Linha) - 1, 1 );
				const range = new vscode.Range(posição1,posição2);
				e.revealRange(range);

			});

		}, (error) => {
			console.error(error);
			debugger;

		});

	}
}

function Hilite(Texto = '', subTexto = '') {

	let posi, posf = 0;
	let TextoFinal = '';

	const TextoUperCase = Texto.toUpperCase();

	while (posf >= 0) {
		posf = TextoUperCase.indexOf(subTexto.toUpperCase(), posf);
		if (posf >= 0) {
			TextoFinal += Texto.substring(posi, posf) + "<span>";
			posi = posf;
			posf += subTexto.length;
			TextoFinal += Texto.substring(posi, posf) + "</span>";
			posi = posf;

		} else {
			TextoFinal += Texto.substring(posi);
		}

	}

	return TextoFinal;

}

async function getSearchString(valorInicial) {

	let choices = vscode.workspace.getConfiguration().get('zSearch.SearchStrings.ListOfPreviousSearchStrings');

	return new Promise((resolve) => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = choices.map(choice => ({ label: choice }));
		quickPick.step = 1;
		quickPick.totalSteps = 2;
		quickPick.value = valorInicial;
		quickPick.title = 'Select search string';
		quickPick.placeholder = 'Search string';

		quickPick.onDidChangeValue(() => {
			// INJECT user values into proposed values
			if (!choices.includes(quickPick.value)) quickPick.items = [quickPick.value, ...choices].map(label => ({ label }))
		})

		quickPick.onDidAccept(() => {
			const selection = quickPick.activeItems[0]
			resolve(selection.label)
			if (!choices.includes(selection.label)) {
				choices.unshift(selection.label)
				if (choices.length > vscode.workspace.getConfiguration().get('zSearch.SearchStrings.NumberOfPreviousSearchStrings')) {
					choices.pop();
				}
			}
			vscode.workspace.getConfiguration().update('zSearch.SearchStrings.ListOfPreviousSearchStrings', choices);
			quickPick.hide();
		})
		quickPick.show();
	}).then(valor => {
		console.log(valor);
		return valor;
	})
}
async function getSearchFiters() {

	let choices = vscode.workspace.getConfiguration().get('zSearch.SearchFilters.ListOfPreviousSearchFilters');

	return new Promise((resolve) => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = choices.map(choice => ({ label: choice }));
		quickPick.step = 2;
		quickPick.totalSteps = 2;
		quickPick.value = "";
		quickPick.title = 'Select search filters';
		quickPick.placeholder = 'Search filters';
		quickPick.canSelectMany = true;
		quickPick.ignoreFocusOut = true;


		quickPick.onDidChangeValue(() => {
			// INJECT user values into proposed values
		})

		quickPick.onDidAccept(() => {
			console.log('onDidAccept ' + quickPick.selectedItems)
			if (!quickPick.value) {
				console.log(quickPick.selectedItems);
				resolve(quickPick.selectedItems)
				quickPick.hide();
			} else {
				if (!choices.includes(quickPick.value)) {
					let seleccao = [];
					for (let i = 0; i < quickPick.selectedItems.length; i++) {
						const indice = quickPick.items.indexOf(quickPick.selectedItems[i])
						if (indice > -1) {
							seleccao.push(indice);
						}
					}
					let Lista = [];

					quickPick.items = [quickPick.value, ...choices].map(label => ({ label }))

					choices.unshift(quickPick.value);

					Lista.push(quickPick.items[0]);

					for (let i = 0; i < seleccao.length; i++) {
						const element = seleccao[i] + 1;
						Lista.push(quickPick.items[element])

					}

					quickPick.selectedItems = Lista;

					quickPick.value = "";
				}
			}
		})
		quickPick.onDidHide(() => {

			const NumeroHistorico = vscode.workspace.getConfiguration().get('zSearch.SearchFilters.NumberOfPreviousSearchStrings');
			let update = [];
			quickPick.items.forEach(valor => {
				update.push(valor.label);
			})

			while (NumeroHistorico < update.length) {
				update.pop();
			}
			vscode.workspace.getConfiguration().update('zSearch.SearchFilters.ListOfPreviousSearchFilters', update);

			let resultados = [];
			quickPick.selectedItems.forEach(valor => {

				resultados.push(valor.label);
			})
			return resultados;
		})


		quickPick.show();
	})
}