# 流程1
https://as.hypergryph.com/user/auth/v1/token_by_phone_password
使用POST
## 参数：
{
"phone": "19872768846",
"password": "Baiyue2003."
}
## 响应：
{
"data": {
"token": "2GhHVSju857QY9780eiqIdsN"
},
"msg": "OK",
"status": 0,
"type": "A"
}
### 此响应获取的token需要保留

# 流程2
https://as.hypergryph.com/user/oauth2/v2/grant
使用POST
## 参数：
{
"token": "2GhHVSju857QY9780eiqIdsN",  //这是流程1的token
"appCode": "be36d44aa36bfb5b",  //固定值
"type": 1  //固定值
}
## 响应：
{
"data": {
"token": "oUbGGYDLbDbnaDArdsKVchjdrUVJf+d5CkneAF9m3vpWSIDdwlGte9IENg9cXR3CRVXdLlSdqkYaPy2uN474fKts8Dw53FaEaMdt+GSHRdfZ7LZ3qZjlYMBlaS8yoQb2HkGCymha9YBFaBTOcFl04+OY7szAptCD4gGRBb3dsYU=",
"hgId": "117430637"
},
"msg": "OK",
"status": 0,
"type": "A"
}
### 响应获取的token需要保留

# 流程3
https://binding-api-account-prod.hypergryph.com/account/binding/v1/u8_token_by_uid
使用POST
## 参数：
{
"token":"oUbGGYDLbDbnaDArdsKVchjdrUVJf+d5CkneAF9m3vpWSIDdwlGte9IENg9cXR3CRVXdLlSdqkYaPy2uN474fKts8Dw53FaEaMdt+GSHRdfZ7LZ3qZjlYMBlaS8yoQb2HkGCymha9YBFaBTOcFl04+OY7szAptCD4gGRBb3dsYU=",  //此token为流程2响应的token
"uid":"19371587"
}

## 响应：
{
"data": {
"token": "P+gzVkn9IbJD2RkZfeBGP6/Kmf9QSTvg8NU+PM0D7CBsLh2yvRToBacR614SzaGKqgtmOY/hEzLZqku8gnV9rn40tYp3tGRMBLvdiLuSqH1CwfoPxWQgsOWJPCozH3n319hQcTuc7vV+VyXIUl9JgruV/QzAxoTTjzzn67Bm2CW4KZSI"
},
"msg": "OK",
"status": 0
}
### 此响应token为x-role-token，需要保存

# 流程4
https://ak.hypergryph.com/user/api/role/login
使用POST
## 参数
{"token":"P+gzVkn9IbJD2RkZfeBGP6/Kmf9QSTvg8NU+PM0D7CBsLh2yvRToBacR614SzaGKqgtmOY/hEzLZqku8gnV9rn40tYp3tGRMBLvdiLuSqH1CwfoPxWQgsOWJPCozH3n319hQcTuc7vV+VyXIUl9JgruV/QzAxoTTjzzn67Bm2CW4KZSI",  //此token为流程3的x-role-token
"source_from":"",   //此处值空白即可
"share_type":"",  //此处值空白即可
"share_by":""    //此处值空白即可
"share_by":""    //此处值空白即可
}

## 响应
{
"code": 0,
"msg": "",
"data": {}
}

此响应内容无需理会，重要的是流程4通过响应此正确响应之后，会有一个cookie值
name:ak-user-center
value:TTuIkHeVJ2pRzI7x5rkcFa%2BaeCz%2FCBzjNPdb5bHK0pSntD2ZBfNibkQoAaKMxjKXKq1ZJrJW4z3cJr6dv9tymmjF%2FzAHumDC5TLCxXPt5XI4R%2FWkUs8EDCR7ZZk61hf1TGdl9kZC6epOBd7D16W93%2B0vfoNd48DpGS5BWjTJsl3UyDmWd9%2F2DoRWWkPvl5vp5PJACyySMa9Q1odhhOe1qHBTTv2teIJSUEajX4rJsmDP%2FXwP7O%2F2uV1wSAwRJYlFWG%2FOmcBBPAqYVY86cKWIukZalqXeMnBPkJHPbcthBiqwelPaqCYXnujodNXv021obOSiUCDbd4QCOWm34yG6rHGpVjCfIUqREQLwkMV2xxnJXYF3YWcikhvEn8EZNEFI%2BVbQSEhgQD9ord86kROp9jnKKviCcq1nkGUYK4U1QYk%3D

# 流程5
https://ak.hypergryph.com/user/api/inquiry/gacha/cate
使用GET
## 参数（这里是请求头）
uid：          //此为游戏内uid
cookie：            //此cookie为流程4获取的cookie，cookie的值为ak-user-center={value}
x-role-token：       //此处值为流程3获取的x-role-token
x-account-token:         //此处为输入手机号密码登录后得到的token

## 响应
{
"code": 0,
"data": [
{
"id": "anniver_fest",
"name": "限定寻访\n庆典"
},
{
"id": "mujica",
"name": "梦中舞会\n人偶寻访"
},
{
"id": "normal",
"name": "标准寻访"
},
{
"id": "classic",
"name": "中坚寻访"
}
],
"msg": ""
}

### 此处id为category的值，将在下一个环节用到，name是卡池类型

# 流程6
https://ak.hypergryph.com/user/api/inquiry/gacha/history
使用GET
## 参数params
uid:
cookie：
x-account-token：
x-role-token：
category:
size:

### 前四个参数为流程5用过的，值相同，category的值为流程5的id，size固定为10

## 响应
{
"code": 0,
"data": {
"list": [
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_281_popka",
"charName": "泡普卡",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 9
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_208_melan",
"charName": "玫兰莎",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 8
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_277_sqrrel",
"charName": "阿消",
"rarity": 3,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 7
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_258_podego",
"charName": "波登可",
"rarity": 3,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 6
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_283_midn",
"charName": "月见夜",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 5
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_440_pinecn",
"charName": "松果",
"rarity": 3,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 4
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_123_fang",
"charName": "芬",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 3
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_124_kroos",
"charName": "克洛丝",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 2
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_281_popka",
"charName": "泡普卡",
"rarity": 2,
"isNew": false,
"gachaTs": "1757053899389",
"pos": 1
},
{
"poolId": "LINKAGE_65_0_1",
"poolName": "人偶的歌谣",
"charId": "char_4182_oblvns",
"charName": "丰川祥子",
"rarity": 5,
"isNew": true,
"gachaTs": "1757053899389",
"pos": 0
}
],
"hasMore": true
},
"msg": ""
}

### poolname为卡池的名字 charname为干员名称，gachaTs为抽取时间，pos是抽卡记录的序列。
后面要做卡池显示的翻页功能的时候，将会需要用到pos,gachaTs，和hasMore
hasMore为true时，则此后面还有抽卡数据记录，为false则此卡池后面没有数据了
pos固定为0
每次翻页都会传参pos为0的gachaTs值，然后同时检测hasMore是否为false，如果时false则没有下一页

