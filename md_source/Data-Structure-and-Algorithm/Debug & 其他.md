# Debug & 其他

[Problem - B - Codeforces](https://codeforces.com/contest/1999/problem/B)

分类讨论（一大堆if-else），出了问题不好检查，可以从逻辑上的对称性入手。本题上半和下半在逻辑上是对等的，所以应该用else分开，而不是继续else if。
```c++
void solve(){
	int a1,a2,b1,b2;
	cin>>a1>>a2>>b1>>b2;
	int ans=0;
	int mxa=max(a1,a2),mna=a1+a2-mxa, mxb=max(b1,b2),mnb=b1+b2-mxb;
	if(mna>=mxb) {//不会输 
		if(mxa>mnb) {//至少赢一局 
			ans=4;
		}
		else ans=0;
	}
	//至少1个a小于1个b，ans不可能是4 ，max对max,min对min,否则一定输 
	else {
		if(mxa==mxb){ //平一局 
			if(mna>mnb) ans=2;
			else ans=0;
		}else if(mxa>mxb){//赢一局 
			if(mna>=mnb) ans=2;//平或赢 
			else ans=0;
		}else ans=0;
	} 
	cout<<ans<<"\n";
} 
```