<h2>代数</h2>

线性代数、抽象代数（群、环、域、模）、范畴论、表示论、交换代数，算术几何是数论的一个领域

```mermaid
%%{init: {"themeVariables": {"fontSize": "18px"}, "flowchart": {"nodeSpacing": 35, "rankSpacing": 45}}}%%
flowchart TB
    LA["线性代数"] --> AA["抽象代数"]

    AA --> GROUP["群论"]
    AA --> RF["环论与域论"]
    AA -.-> CAT["范畴论"]

    LA --> LIE["李代数"]
    AA --> LIE

    GROUP --> REP["表示论"]
    GROUP --> GALOIS["伽罗瓦理论"]
    RF --> GALOIS

    RF --> COMM["交换代数"]
    RF --> ANT["代数数论"]

    CAT --> HOM["同调代数"]
    COMM --> AG["代数几何"]
    HOM -.-> AG

    AG --> ARG["算术几何"]
    ANT --> ARG

    LIE -.-> LG["李群"]
    REP -.-> LG
```

<posts-list>

<title-link> 
css_source/main_style.css
Linear Algebra,线性代数
[2025-8-10](./Linear-Algebra/index.md)
</title-link>

</posts-list>