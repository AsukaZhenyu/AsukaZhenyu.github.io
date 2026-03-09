## 数论

### 异或

**最小异或结果** 有一个数a，和一个数组nums，要寻找与a异或最小的结果。可以贪心的来看，对于一个32（64）位整数，从左往右看，不一样的位出现的越晚，不一样的位数越少，异或的结果越小。问题转化为寻找最长相同前缀的二进制数。可以将nums里的所有数构建为一个深32（64）的字典树，按照a的位数情况寻找即可。这样将$O(n)$的遍历优化为了$O(log(n))$的查询。

### k进制
对于任意数，如何得到它的k进制表达.

```c++
string s;
while(a){
    // 越先得到的余数，位数越低
    s=to_string(a%k)+s;
    a/=k;
}

```

### 质数

1. 判断一个数是否为质数：i<=$\sqrt{n}$，n!=1
   ```python
   is_prime = lambda n: n >= 2 and all(n % i for i in range(2, isqrt(n) + 1))
   ```
   python语言中`all`和`any`函数表示多个变量的**与**和**或**操作。`isqrt()`表示距离根号最近的整数。
   ```c++
   bool is_prime(int n){
		for(int i=2;i*i<=n;i++){
			if(n%i==0) return false;
		}
		return n>=2;
   }
   ```

2. 埃氏筛

   ```c++
   const int MX = 1e5;
   bool np[MX + 1]; // 质数=false 非质数=true
   int init = []() {
   np[1] = true;
   for (int i = 2; i * i <= MX; i++) {
       if (!np[i]) {
           for (int j = i * i; j <= MX; j += i) {
               np[j] = true;
           }
       }
   }
   return 0;
   }();
   ```
   ```python
   MX = 10 ** 5 + 1
   is_prime = [True] * MX
   is_prime[1] = False
   for i in range(2, isqrt(MX) + 1):
       if is_prime[i]:
           for j in range(i * i, MX, i):
               is_prime[j] = False
   ```

3. 欧拉筛
   ```java
   public List<Integer> makeCharts(int n) {
        List<Integer> charts = new ArrayList();
        boolean[] marked = new boolean[n + 1];
        for (int i = 2; i <= n; i++) {
            if (!marked[i]) charts.add(i);
            for (int p : charts) {
                if (i * p > n) break;
                marked[i * p] = true;
                if (i % p == 0)break;
            }
        }
        return charts;
    }
   ```

质数筛还可以用来求最小质因数：

```c++
const int MX=1e6+1;
int LPF[MX];
auto init=[](){
    for(int i=2;i<MX;i++){
        for(int j=i;j<MX;j+=i){
            if(LPF[j]==0){
                LPF[j]=i;
            }
        }
    }
    return 0;
}();
```

筛选质因数
```c++
for(int i=2;i<=x_;i++){
	while(x_%i==0){
		px.push_back(i);
		x_/=i;
	}
}
```

1. 只有当x为奇数或4的倍数时才能拆分为两个数的平方差。
1. 最小公倍数：`lcm(a,b,c)=lcm(lcm(a,b),c)`

![c9878dbf0d19e135e21f9c6da3893d1](C:\Users\lzy\AppData\Local\Temp\WeChat Files\c9878dbf0d19e135e21f9c6da3893d1.png)

当lcm函数内的变量类型是int时会爆，需要类型转换，例如：

```c++
long long la=a;
long long lb=b;
long long lab=lcm(la,lb);

//or
long long lab=lcm((long long)a,(long long)b);
```