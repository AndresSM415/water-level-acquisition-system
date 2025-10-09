```mermaid
graph LR
  %% The system
  A[server]
  B[Web page]
  C[Web page]
  D[Web page]

  %% External entities
  E((User))
  F((User))
  G((User))
  H((Plant))


  %% Connections
  A --- H

  E --- B --- A
  F --- C --- A
  G --- D --- A


```