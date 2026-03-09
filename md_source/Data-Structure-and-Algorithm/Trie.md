## 字典树Trie

> 匹配多串前缀/后缀
> =>字典树Trie

>多串匹配也可以考虑字符哈希，但是不一定对，万一哈希冲突了呢？

模板1
```c++
class Trie {
private:
    bool isEnd;
    Trie* next[26];
public:
    Trie() {
        isEnd = false;
        memset(next, 0, sizeof(next));
    }
    
    void insert(string word) {
        Trie* node = this;
        for (char c : word) {
            if (node->next[c-'a'] == NULL) {
                node->next[c-'a'] = new Trie();
            }
            node = node->next[c-'a'];
        }
        node->isEnd = true;
    }
    
    bool search(string word) {
        Trie* node = this;
        for (char c : word) {
            node = node->next[c - 'a'];
            if (node == NULL) {
                return false;
            }
        }
        return node->isEnd;
    }
    
    bool startsWith(string prefix) {
        Trie* node = this;
        for (char c : prefix) {
            node = node->next[c-'a'];
            if (node == NULL) {
                return false;
            }
        }
        return true;
    }
};
```
模板2
```c++
struct Trie {
    bool is_finished;
    Trie* child[26];

    Trie() {
        is_finished = false;
        fill(begin(child), end(child), nullptr);
    }
};

class MagicDictionary {
public:
    MagicDictionary() {
        root = new Trie();
    }
    
    void buildDict(vector<string> dictionary) {
        for (auto&& word: dictionary) {
            Trie* cur = root;
            for (char ch: word) {
                int idx = ch - 'a';
                if (!cur->child[idx]) {
                    cur->child[idx] = new Trie();
                }
                cur = cur->child[idx];
            }
            cur->is_finished = true;
        }
    }
    
    bool search(string searchWord) {
        function<bool(Trie*, int, bool)> dfs = [&](Trie* node, int pos, bool modified) {
            if (pos == searchWord.size()) {
                return modified && node->is_finished;
            }
            int idx = searchWord[pos] - 'a';
            if (node->child[idx]) {
                if (dfs(node->child[idx], pos + 1, modified)) {
                    return true;
                }
            }
            if (!modified) {
                for (int i = 0; i < 26; ++i) {
                    if (i != idx && node->child[i]) {
                        if (dfs(node->child[i], pos + 1, true)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        return dfs(root, 0, false);
    }

private:
    Trie* root;
};
```

模板3：将node和Trie类分开

```c++
struct TrieNode {
    TrieNode* chil[26] = {nullptr};
};
class Trie {
public:
    TrieNode* root;
    Trie() { root = new TrieNode(); }
    void insert(const string& word) {
        TrieNode* node = root;
        for (char c : word) {
            int index = c - 'a';
            if (node->chil[index] == nullptr) {
                node->chil[index] = new TrieNode();
            }
            node = node->chil[index];
        }
    }
    vector<int> search(const string& target, int pos) {
        TrieNode* node = root;
        vector<int> pres;
        for (int i = pos; i < target.size(); ++i) {
            int index = target[i] - 'a';
            if (node->chil[index] == nullptr) {
                break;
            }
            node = node->chil[index];
            pres.push_back(i - pos + 1);
        }
        return pres;
    }
};
```

### 模板题

[3093. 最长公共后缀查询](https://leetcode.cn/problems/longest-common-suffix-queries/)
字典树基本的结构就是多叉树（儿子的某个节点不为空就表示有这么一个字符），除此之外还可以在每个节点（根据具体问题）加上其他值。这题外加了2个节点值。
1. 答案，在这个问题中，答案就是前面串的下标，所以每个节点要存一个满足条件的下标。
2. 用于更新答案的值，在这里就是取最短的，那就要存当前满足要求的最短串的长度。
事实上在这个问题中还有两个条件，如果长度相等那就取最先出现的，这个可以在更新答案的时候保证，严格下降的时候才更新下标。还有一点是要取最长的公共前缀，这可以利用字典树的性质解决。
```c++
struct Node {
    Node *son[26]{};
    int min_l = INT_MAX, i;
};

class Solution {
public:
    vector<int> stringIndices(vector<string> &wordsContainer, vector<string> &wordsQuery) {
        Node *root = new Node();
        for (int idx = 0; idx < wordsContainer.size(); ++idx) {
            auto &s = wordsContainer[idx];
            int l = s.length();
            auto cur = root;
            if (l < cur->min_l) {
                cur->min_l = l;
                cur->i = idx;
            }
            for (int i = s.length() - 1; i >= 0; i--) {
                int b = s[i] - 'a';
                if (cur->son[b] == nullptr) {
                    cur->son[b] = new Node();
                }
                cur = cur->son[b];
                if (l < cur->min_l) {
                    cur->min_l = l;
                    cur->i = idx;
                }
            }
        }

        vector<int> ans;
        ans.reserve(wordsQuery.size());
        for (auto &s: wordsQuery) {
            auto cur = root;
            for (int i = s.length() - 1; i >= 0 && cur->son[s[i] - 'a']; i--) {
                cur = cur->son[s[i] - 'a'];
            }
            ans.push_back(cur->i);
        }
        return ans;
    }
};
```

### 字典树

可以高效地寻找拥有相同前缀的字符串。

模板1：
```c++
struct Node{
    Node* son[26]{};
    bool isend=false;
};

class Trie{
    Node* root=new Node();

    int find(string word){
        Node* cur=root;
        for(char c:word){
            c-='a';
            if(cur->son[c]==nullptr){
                return 0;
            }
            cur=cur->son[c];
        }
        return cur->isend?2:1;
    }
public:
    void insert(string word){
        Node* cur=root;
        for(char c:word){
            c-='a';
            if(cur->son[c]==nullptr){
                cur->son[c]=new Node();
            }
            cur=cur->son[c];
        }
        cur->isend=true;
    }

}

```

模板2：使用int代表节点而非指针，运行效率更高
```c++
struct Trie{
    int tot,ch[MAXN*32][2],cnt[MAXN*32];
    void insert(int x){
        int now=0;
        for(int i=30;i>=0;i--){
            int u=(x>>i)&1;
            if(!ch[now][u]){
                ch[now][u]=++tot;
            }
            now=ch[now][u];
            cnt[now]++;
        }
    }
}trie;
```

进阶：AC自动机

