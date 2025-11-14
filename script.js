// Proteção Simples (Não segura)
const senhaCorreta = "4321"; 
let acessoPermitido = false;

while (!acessoPermitido) {
    const senhaDigitada = prompt("Por favor, digite a senha para acessar o mapa:");
    
    if (senhaDigitada === senhaCorreta) {
        acessoPermitido = true;
        alert("Acesso concedido!");
    } else {
        alert("Senha incorreta. Tente novamente.");
        // Opcional: Se quiser redirecionar após tentativas, use:
        // window.location.href = "https://google.com";
    }
}
// O restante do seu script.js só rodará se a senha estiver correta.

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seletores (Mantidos)
    const mesas = document.querySelectorAll('.mesa');
    const modalOverlay = document.getElementById('modal-mesa');
    const modalDisplayId = document.getElementById('mesa-id-display');
    const formOcupacao = document.getElementById('form-ocupacao');
    const btnFechar = document.querySelector('.btn-fechar');
    const btnLiberar = document.querySelector('.btn-liberar');
    const btnExportar = document.getElementById('btn-exportar');

    let mesaSelecionada = null;

    // 2. ☁️ CARREGAR DADOS DO FIREBASE EM TEMPO REAL
    // Usamos 'refMesas' definido no seu HTML para monitorar mudanças
    const carregarStatusMesas = () => {
        // O Firebase vai chamar esta função toda vez que os dados mudarem (em qualquer dispositivo)
        refMesas.on('value', (snapshot) => {
            const statusAtualizado = snapshot.val(); // Obtém todos os dados das mesas
            
            mesas.forEach(mesa => {
                const mesaId = mesa.id; // Ex: "mesa-26"
                const statusMesa = statusAtualizado && statusAtualizado[mesaId] ? statusAtualizado[mesaId] : null;

                if (statusMesa && statusMesa.status === 'ocupada') {
                    mesa.classList.add('ocupada');
                    // Salva os dados no elemento DOM para uso temporário
                    mesa.dataset.dados = JSON.stringify({ nome: statusMesa.nome, obs: statusMesa.obs }); 
                } else {
                    mesa.classList.remove('ocupada');
                    delete mesa.dataset.dados;
                }
            });
        });
    };

    // 3. 🖱️ Adicionar ouvinte de clique para cada mesa (Inalterado)
    mesas.forEach(mesa => {
        mesa.addEventListener('click', () => {
            mesaSelecionada = mesa;
            const mesaNome = mesa.dataset.nome;
            const isOcupada = mesa.classList.contains('ocupada');
            
            modalDisplayId.textContent = mesaNome;
            btnLiberar.dataset.mesaId = mesa.id;

            // Preenche o formulário
            if (isOcupada && mesa.dataset.dados) {
                const dados = JSON.parse(mesa.dataset.dados);
                document.getElementById('nome-ocupante').value = dados.nome || '';
                document.getElementById('observacoes').value = dados.obs || '';
                btnLiberar.style.display = 'block';
                document.querySelector('.btn-ocupar').textContent = 'Atualizar Ocupação';
            } else {
                formOcupacao.reset();
                btnLiberar.style.display = 'none';
                document.querySelector('.btn-ocupar').textContent = 'Confirmar Ocupação';
            }
            
            modalOverlay.style.display = 'flex';
        });
    });

    // 4. ☁️ Lógica de Ocupar/Atualizar - AGORA SALVA NO FIREBASE
    formOcupacao.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (mesaSelecionada) {
            const nome = document.getElementById('nome-ocupante').value;
            const obs = document.getElementById('observacoes').value;
            
            const dadosParaFirebase = {
                status: 'ocupada',
                nome: nome,
                obs: obs,
                timestamp: new Date().toISOString()
            };

            // SALVA NO FIREBASE: A função carregarStatusMesas atualiza a interface
            refMesas.child(mesaSelecionada.id).set(dadosParaFirebase)
                .then(() => {
                    modalOverlay.style.display = 'none';
                    alert(`Mesa ${mesaSelecionada.dataset.nome} ocupada/atualizada e sincronizada!`);
                })
                .catch(error => {
                    alert("Erro ao salvar no Firebase: " + error.message);
                });
        }
    });

    // 5. ☁️ Lógica de Liberar - AGORA COM CONFIRMAÇÃO
btnLiberar.addEventListener('click', () => {
    if (mesaSelecionada) {
        
        // 💡 NOVA LINHA: Adiciona a confirmação
        const confirmar = confirm(`Tem certeza que deseja LIBERAR a mesa ${mesaSelecionada.dataset.nome}?`);
        
        if (confirmar) {
            // REMOVE O DADO DO FIREBASE SOMENTE SE O USUÁRIO CLICAR EM 'OK'
            refMesas.child(mesaSelecionada.id).remove()
                .then(() => {
                    modalOverlay.style.display = 'none';
                    alert(`Mesa ${mesaSelecionada.dataset.nome} liberada e sincronizada!`);
                })
                .catch(error => {
                    alert("Erro ao liberar no Firebase: " + error.message);
                });
        }
        // Se o usuário clicar em 'Cancelar', nada acontece, e o modal permanece aberto.
    }
});
    // 6. Fechar Modal (Inalterado)
    btnFechar.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });
    
    // 7. 📊 Lógica de Exportação para CSV (AGORA LÊ O ESTADO ATUAL)
    btnExportar.addEventListener('click', () => {
        // Pega o estado atual do Firebase (não espera o real-time)
        refMesas.once('value').then((snapshot) => {
            const statusFirebase = snapshot.val() || {};
            
            let dadosCSV = "Mesa;Status;Nome dos Ocupantes;Observacoes\n";
            let mesasEncontradas = false;

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusDados = statusFirebase[mesaId];

                let statusDisplay = "LIVRE";
                let nomeOcupante = "";
                let obs = "";

                if (statusDados && statusDados.status === 'ocupada') {
                    statusDisplay = "OCUPADA";
                    // Limpa o texto para evitar quebras no CSV (substitui ';' por ',')
                    nomeOcupante = statusDados.nome ? statusDados.nome.replace(/;/g, ',') : "";
                    obs = statusDados.obs ? statusDados.obs.replace(/;/g, ',') : "";
                }
                
                // Adiciona a linha ao CSV
                dadosCSV += `${mesaNome};${statusDisplay};${nomeOcupante};${obs}\n`;
                mesasEncontradas = true;
            });

            if (!mesasEncontradas) {
                alert("Nenhuma mesa foi encontrada para exportação. Verifique se as mesas foram adicionadas ao HTML.");
                return;
            }

            // Cria e inicia o download do arquivo
            const nomeArquivo = `Status_Mesas_${new Date().toISOString().slice(0, 10)}.csv`;
            const blob = new Blob(['\ufeff', dadosCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    // Inicia o carregamento
    carregarStatusMesas();

});
