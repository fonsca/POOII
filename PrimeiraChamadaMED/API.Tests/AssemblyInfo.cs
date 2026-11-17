// Cada classe de teste sobe a API com o próprio banco temporário.
// Rodar as classes em sequência evita disputa entre elas e deixa a saída mais fácil de ler.
[assembly: CollectionBehavior(DisableTestParallelization = true)]